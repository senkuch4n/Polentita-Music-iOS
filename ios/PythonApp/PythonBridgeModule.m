#import "PythonBridgeModule.h"
#import "PythonRuntime.h"

// Classic RCTBridgeModule rather than the Expo Modules API -- works fine
// under the New Architecture via its backward-compat interop layer (same as
// react-native-track-player v4), and sidesteps Expo local-module autolinking
// scaffolding for a module that only this app will ever consume.
@implementation PythonBridgeModule

RCT_EXPORT_MODULE(PythonBridge);

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (dispatch_queue_t)methodQueue {
    return dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0);
}

- (void)ensureStarted:(RCTPromiseRejectBlock)reject started:(void (^)(void))onStarted {
    NSError *error = nil;
    if (![[PythonRuntime shared] startWithError:&error]) {
        reject(@"python_start_failed", error.localizedDescription ?: @"Failed to start Python runtime", error);
        return;
    }
    onStarted();
}

RCT_EXPORT_METHOD(inspectMedia:(NSString *)url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self ensureStarted:reject started:^{
        NSError *error = nil;
        NSString *json = [[PythonRuntime shared] inspectMedia:url error:&error];
        if (json) resolve(json); else reject(@"inspect_media_failed", error.localizedDescription, error);
    }];
}

RCT_EXPORT_METHOD(inspectPlaylist:(NSString *)url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self ensureStarted:reject started:^{
        NSError *error = nil;
        NSString *json = [[PythonRuntime shared] inspectPlaylist:url error:&error];
        if (json) resolve(json); else reject(@"inspect_playlist_failed", error.localizedDescription, error);
    }];
}

RCT_EXPORT_METHOD(previewAudio:(NSString *)url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self ensureStarted:reject started:^{
        NSError *error = nil;
        NSString *json = [[PythonRuntime shared] previewAudio:url error:&error];
        if (json) resolve(json); else reject(@"preview_audio_failed", error.localizedDescription, error);
    }];
}

RCT_EXPORT_METHOD(searchYoutube:(NSString *)query
                  page:(NSInteger)page
                  pageSize:(NSInteger)pageSize
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self ensureStarted:reject started:^{
        NSError *error = nil;
        NSString *json = [[PythonRuntime shared] searchYoutube:query page:page pageSize:pageSize error:&error];
        if (json) resolve(json); else reject(@"search_youtube_failed", error.localizedDescription, error);
    }];
}

RCT_EXPORT_METHOD(downloadAudio:(NSString *)url
                  outputDir:(NSString *)outputDir
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self ensureStarted:reject started:^{
        NSError *error = nil;
        NSString *json = [[PythonRuntime shared] downloadAudio:url
                                                       outputDir:outputDir
                                                 progressHandler:^(NSString *status, int64_t downloaded, int64_t total, double speed) {}
                                                  cancelHandler:^BOOL{ return NO; }
                                                           error:&error];
        if (json) resolve(json); else reject(@"download_audio_failed", error.localizedDescription, error);
    }];
}

@end
