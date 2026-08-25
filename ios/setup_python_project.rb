#!/usr/bin/env ruby
# One-shot script wiring the embedded-CPython + QuickJS bridge into the Xcode
# project. Idempotent -- safe to re-run after `expo prebuild` regenerates the
# project (checks for existing entries before adding).
require 'xcodeproj'

project_path = 'PolentitaMusic.xcodeproj'
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'PolentitaMusic' }
raise "Target not found" unless target

main_group = project.main_group

# 1. PythonApp source group (PythonRuntime.h/.m, PythonBridgeModule.h/.m)
python_group = main_group['PythonApp'] || main_group.new_group('PythonApp', 'PythonApp')

%w[PythonRuntime.h PythonRuntime.m PythonBridgeModule.h PythonBridgeModule.m].each do |filename|
  next if python_group.files.any? { |f| f.path == filename }
  file_ref = python_group.new_reference(filename)
  target.add_file_references([file_ref]) if filename.end_with?('.m')
end

# 2. app/ and app_packages/ as folder references (blue folders) -- copied
# verbatim into the bundle, preserving directory structure, via Copy Bundle
# Resources (added below).
[['app', 'PythonApp/app'], ['app_packages', 'PythonApp/app_packages']].each do |name, path|
  next if python_group.children.any? { |c| c.respond_to?(:path) && c.path == path && c.is_a?(Xcodeproj::Project::Object::PBXFileReference) && c.last_known_file_type == 'folder' }
  ref = python_group.new_reference(path)
  ref.set_source_tree('SOURCE_ROOT')
  ref.last_known_file_type = 'folder'
  target.resources_build_phase.add_file_reference(ref)
end

# 3. QuickJS bridge dylibs (both slices) as plain resources -- the "Install
# QuickJS bridge" script phase below picks the right one at build time.
%w[libqjsbridge-device.dylib libqjsbridge-simulator.dylib].each do |filename|
  next if python_group.files.any? { |f| f.path == filename }
  ref = python_group.new_reference(filename)
  target.resources_build_phase.add_file_reference(ref)
end

# 4. Python.xcframework: embed & sign.
xcframework_path = 'Python.xcframework'
unless main_group.files.any? { |f| f.path == xcframework_path }
  fw_ref = main_group.new_reference(xcframework_path)
  target.frameworks_build_phase.add_file_reference(fw_ref)
  embed_phase = target.copy_files_build_phases.find { |p| p.name == 'Embed Frameworks' } ||
    target.new_copy_files_build_phase('Embed Frameworks').tap { |p| p.symbol_dst_subfolder_spec = :frameworks }
  build_file = embed_phase.add_file_reference(fw_ref)
  build_file.settings = { 'ATTRIBUTES' => ['CodeSignOnCopy', 'RemoveHeadersOnCopy'] }
end

# 5. Build settings.
target.build_configurations.each do |config|
  fsp = config.build_settings['FRAMEWORK_SEARCH_PATHS'] || ['$(inherited)']
  fsp = [fsp] if fsp.is_a?(String)
  ['$(PROJECT_DIR)', '$(BUILT_PRODUCTS_DIR)'].each { |p| fsp << p unless fsp.include?(p) }
  config.build_settings['FRAMEWORK_SEARCH_PATHS'] = fsp

  hsp = config.build_settings['HEADER_SEARCH_PATHS'] || ['$(inherited)']
  hsp = [hsp] if hsp.is_a?(String)
  header_path = '"$(BUILT_PRODUCTS_DIR)/Python.framework/Headers"'
  hsp << header_path unless hsp.include?(header_path)
  config.build_settings['HEADER_SEARCH_PATHS'] = hsp

  config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
  # python-apple-support's install_python script expects a single-arch
  # simulator slice (matches our own QuickJS dylib, built arm64-only for the
  # simulator too) -- exclude x86_64 sim, standard for Apple Silicon dev.
  config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'x86_64'
end

# 6. "Install QuickJS bridge" script phase -- copies the right slice into the
# bundle as libqjsbridge.dylib and code-signs it (before "Process Python
# libraries", so the bundle layout is stable when Python's own
# postprocessing runs). A plain `cp` produces an unsigned file; real devices
# refuse to dlopen an unsigned/ad-hoc-less dylib (the Simulator doesn't
# enforce this, which is why this only surfaced once testing on-device), and
# the app-level codesign pass later in the build does not reach loose files
# sitting in the bundle root, so this step must sign it itself.
install_qjs_script = <<~SH
  set -e
  if [ "$EFFECTIVE_PLATFORM_NAME" = "-iphonesimulator" ]; then
    SRC="$PROJECT_DIR/PythonApp/libqjsbridge-simulator.dylib"
  else
    SRC="$PROJECT_DIR/PythonApp/libqjsbridge-device.dylib"
  fi
  DEST="$CODESIGNING_FOLDER_PATH/libqjsbridge.dylib"
  cp -f "$SRC" "$DEST"
  if [ -n "$EXPANDED_CODE_SIGN_IDENTITY" ]; then
    codesign --force --sign "$EXPANDED_CODE_SIGN_IDENTITY" "$DEST"
  else
    codesign --force --sign - "$DEST"
  fi
SH
install_qjs_phase = target.shell_script_build_phases.find { |p| p.name == 'Install QuickJS bridge' }
if install_qjs_phase
  install_qjs_phase.shell_script = install_qjs_script
else
  install_qjs_phase = target.new_shell_script_build_phase('Install QuickJS bridge')
  install_qjs_phase.shell_script = install_qjs_script
  resources_phase_index = target.build_phases.index(target.resources_build_phase)
  target.build_phases.move(install_qjs_phase, resources_phase_index + 1)
end

# 7. "Process Python libraries" script phase -- must run after Copy Bundle
# Resources (so app/app_packages/stdlib exist) but before Embed Frameworks
# (so binary .so->framework conversion happens before signing).
unless target.shell_script_build_phases.any? { |p| p.name == 'Process Python libraries' }
  phase = target.new_shell_script_build_phase('Process Python libraries')
  phase.shell_script = <<~SH
    set -e
    source "$PROJECT_DIR/Python.xcframework/build/utils.sh"
    install_python Python.xcframework app app_packages
  SH
  install_qjs_index = target.build_phases.index(install_qjs_phase)
  target.build_phases.move(phase, install_qjs_index + 1)
end

project.save
puts "Xcode project updated."
