#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

extern NSString *const PolentitaPythonErrorDomain;

// Owns the embedded CPython interpreter for the app's lifetime. All calls
// serialize onto a single dedicated queue -- mirrors the Android app's
// PYTHON_LOCK around its Chaquopy interpreter (data/extractor/YtDlpExtractor.kt),
// since neither Chaquopy nor a bare embedded CPython here is free-threaded.
@interface PythonRuntime : NSObject

+ (instancetype)shared;

// Starts the interpreter, registers the in-process QuickJS JS-challenge
// provider (embedded_quickjs_provider.py) ahead of importing yt_dlp_bridge,
// and imports yt_dlp_bridge. Safe to call more than once (idempotent).
// Throws (via NSError) with a human-readable message on failure.
- (BOOL)startWithError:(NSError **)error;

// Each mirrors one entry point in yt_dlp_bridge.py 1:1 (same JSON string
// contract as the Android app's ChaquopyYtDlpExtractor). All run on the
// runtime's private serial queue and block the calling thread until done --
// callers (the Expo module) are expected to dispatch off the JS thread.
- (nullable NSString *)inspectMedia:(NSString *)url error:(NSError **)error;
- (nullable NSString *)inspectPlaylist:(NSString *)url error:(NSError **)error;
- (nullable NSString *)previewAudio:(NSString *)url error:(NSError **)error;
- (nullable NSString *)searchYoutube:(NSString *)query page:(NSInteger)page pageSize:(NSInteger)pageSize error:(NSError **)error;

// progressHandler(status, downloaded, total, speed) is invoked from yt-dlp's
// progress hook, on the runtime's private queue -- caller must hop back to
// its own queue/thread if needed. Return NO from cancelHandler to abort.
- (nullable NSString *)downloadAudio:(NSString *)url
                            outputDir:(NSString *)outputDir
                      progressHandler:(void (^)(NSString *status, int64_t downloaded, int64_t total, double speed))progressHandler
                       cancelHandler:(BOOL (^)(void))cancelHandler
                               error:(NSError **)error;

@end

NS_ASSUME_NONNULL_END
