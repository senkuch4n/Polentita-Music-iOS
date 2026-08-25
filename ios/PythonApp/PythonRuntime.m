#import "PythonRuntime.h"
#import <Python/Python.h>

// Initialization sequence follows CPython's own canonical iOS reference
// (cpython/iOS/testbed/iOSTestbedTests/iOSTestbedTests.m) verbatim for the
// setup portion -- PyConfig_Read() after setting config.home is what
// populates the stdlib/lib-dynload search paths automatically, app_packages
// is added via site.addsitedir() post-init, and app via a direct sys.path
// insert. We diverge after that: no Py_RunMain()/argv, since this runtime
// stays alive as a library the Expo module calls into repeatedly, rather
// than running a script once and exiting.
//
// Threading: all Python work runs on a dedicated NSThread with a 16MB stack,
// not a plain GCD queue. GCD's worker threads default to a 512KB stack on
// iOS, which is nowhere near enough for QuickJS to parse/execute YouTube's
// real player.js -- the constructed challenge-solver script the embedded
// QuickJS provider evaluates is 3+ million characters (the actual player
// script plus the lib/core solver bundles), and QuickJS's recursive-descent
// parser needs real stack depth for that. On a 512KB GCD worker thread this
// overflows the guard page and the thread dies silently -- no exception, no
// crash log, just a permanent hang, which is exactly what a plain
// dispatch_sync(self.queue, ...) produced here. A dedicated large-stack
// thread is the standard fix for embedding a real interpreter/parser inside
// an app whose default thread stacks are sized for typical UI/IO work, not
// deep recursive parsing.
//
// GIL: Py_InitializeFromConfig leaves the calling thread holding the GIL.
// Since Python only ever runs on this one dedicated thread here, no
// PyGILState dance is needed -- the thread that initializes it is the same
// thread that runs every call afterward.

NSString *const PolentitaPythonErrorDomain = @"PolentitaPythonErrorDomain";

static NSString *DescribeCurrentPythonError(void) {
    if (!PyErr_Occurred()) {
        return @"Unknown Python error";
    }
    PyObject *type, *value, *traceback;
    PyErr_Fetch(&type, &value, &traceback);
    PyErr_NormalizeException(&type, &value, &traceback);
    NSString *description = @"Unknown Python error";
    if (value) {
        PyObject *str = PyObject_Str(value);
        if (str) {
            const char *utf8 = PyUnicode_AsUTF8(str);
            if (utf8) {
                description = [NSString stringWithUTF8String:utf8];
            }
            Py_DECREF(str);
        }
    }
    Py_XDECREF(type);
    Py_XDECREF(value);
    Py_XDECREF(traceback);
    return description;
}

static NSError *MakePythonError(NSString *message) {
    return [NSError errorWithDomain:PolentitaPythonErrorDomain
                                code:1
                            userInfo:@{NSLocalizedDescriptionKey: message}];
}

@interface PythonRuntime ()
@property(nonatomic) NSThread *pythonThread;
@property(nonatomic) BOOL started;
@property(nonatomic) PyObject *bridgeModule;
@property(nonatomic) PyObject *nativeSupportModule;
@end

@implementation PythonRuntime

+ (instancetype)shared {
    static PythonRuntime *instance;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [PythonRuntime new];
    });
    return instance;
}

- (void)pythonThreadMain:(dispatch_semaphore_t)readySemaphore {
    @autoreleasepool {
        // Keep the run loop alive indefinitely so performSelector:onThread:
        // can keep dispatching blocks to it for the app's lifetime.
        [[NSRunLoop currentRunLoop] addPort:[NSPort port] forMode:NSDefaultRunLoopMode];
        dispatch_semaphore_signal(readySemaphore);
        while (true) {
            @autoreleasepool {
                [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate distantFuture]];
            }
        }
    }
}

- (void)ensurePythonThread {
    if (self.pythonThread) return;
    dispatch_semaphore_t ready = dispatch_semaphore_create(0);
    NSThread *thread = [[NSThread alloc] initWithTarget:self
                                                selector:@selector(pythonThreadMain:)
                                                  object:ready];
    thread.stackSize = 16 * 1024 * 1024;
    thread.name = @"com.polentita.music.python";
    [thread start];
    dispatch_semaphore_wait(ready, DISPATCH_TIME_FOREVER);
    self.pythonThread = thread;
}

- (void)invokeBlock:(void (^)(void))block {
    block();
}

- (void)runSync:(void (^)(void))block {
    [self ensurePythonThread];
    if ([NSThread currentThread] == self.pythonThread) {
        block();
        return;
    }
    [self performSelector:@selector(invokeBlock:)
                  onThread:self.pythonThread
                withObject:block
             waitUntilDone:YES];
}

- (BOOL)startWithError:(NSError **)error {
    __block BOOL ok = YES;
    __block NSString *failureMessage = nil;

    [self runSync:^{
        if (self.started) {
            return;
        }

        NSString *resourcePath = [[NSBundle mainBundle] resourcePath];
        NSString *quickjsBridgePath = [[NSBundle mainBundle] pathForResource:@"libqjsbridge" ofType:@"dylib"];
        if (quickjsBridgePath) {
            setenv("POLENTITA_QUICKJS_BRIDGE_PATH", quickjsBridgePath.UTF8String, 1);
        }
        setenv("NO_COLOR", "1", 1);

        // The embedded interpreter has no access to the iOS system trust
        // store -- OpenSSL (via Python's ssl module) needs an explicit CA
        // bundle or every HTTPS request yt-dlp makes fails with
        // CERTIFICATE_VERIFY_FAILED: unable to get local issuer certificate.
        NSString *caBundlePath = [NSString stringWithFormat:@"%@/app/cacert.pem", resourcePath];
        setenv("SSL_CERT_FILE", caBundlePath.UTF8String, 1);

        PyPreConfig preconfig;
        PyConfig config;
        PyStatus status;

        PyPreConfig_InitIsolatedConfig(&preconfig);
        PyConfig_InitIsolatedConfig(&config);
        preconfig.utf8_mode = 1;
        config.buffered_stdio = 0;
        config.write_bytecode = 0;
        config.install_signal_handlers = 1;

        status = Py_PreInitialize(&preconfig);
        if (PyStatus_Exception(status)) {
            failureMessage = [NSString stringWithFormat:@"Py_PreInitialize failed: %s", status.err_msg];
            ok = NO;
            PyConfig_Clear(&config);
            return;
        }

        NSString *pythonHome = [NSString stringWithFormat:@"%@/python", resourcePath];
        wchar_t *homeW = Py_DecodeLocale(pythonHome.UTF8String, NULL);
        status = PyConfig_SetString(&config, &config.home, homeW);
        PyMem_RawFree(homeW);
        if (PyStatus_Exception(status)) {
            failureMessage = [NSString stringWithFormat:@"Failed to set PYTHONHOME: %s", status.err_msg];
            ok = NO;
            PyConfig_Clear(&config);
            return;
        }

        status = PyConfig_Read(&config);
        if (PyStatus_Exception(status)) {
            failureMessage = [NSString stringWithFormat:@"PyConfig_Read failed: %s", status.err_msg];
            ok = NO;
            PyConfig_Clear(&config);
            return;
        }

        status = Py_InitializeFromConfig(&config);
        PyConfig_Clear(&config);
        if (PyStatus_Exception(status)) {
            failureMessage = [NSString stringWithFormat:@"Py_InitializeFromConfig failed: %s", status.err_msg];
            ok = NO;
            return;
        }

        // app_packages: added via site.addsitedir so .pth files (if any) run too.
        PyObject *siteModule = PyImport_ImportModule("site");
        PyObject *addSiteDir = siteModule ? PyObject_GetAttrString(siteModule, "addsitedir") : NULL;
        if (!addSiteDir) {
            failureMessage = @"Could not access site.addsitedir";
            ok = NO;
            Py_XDECREF(siteModule);
            return;
        }
        NSString *appPackagesPath = [NSString stringWithFormat:@"%@/app_packages", resourcePath];
        PyObject *result = PyObject_CallFunction(addSiteDir, "s", appPackagesPath.UTF8String);
        Py_DECREF(addSiteDir);
        Py_DECREF(siteModule);
        if (!result) {
            failureMessage = [NSString stringWithFormat:@"site.addsitedir(app_packages) failed: %@", DescribeCurrentPythonError()];
            ok = NO;
            return;
        }
        Py_DECREF(result);

        // app: our own source (yt_dlp_bridge.py, embedded_quickjs*.py) -- direct sys.path insert.
        PyObject *sysModule = PyImport_ImportModule("sys");
        PyObject *sysPath = sysModule ? PyObject_GetAttrString(sysModule, "path") : NULL;
        if (!sysPath) {
            failureMessage = @"Could not access sys.path";
            ok = NO;
            Py_XDECREF(sysModule);
            return;
        }
        NSString *appPath = [NSString stringWithFormat:@"%@/app", resourcePath];
        PyList_Insert(sysPath, 0, PyUnicode_FromString(appPath.UTF8String));
        Py_DECREF(sysPath);
        Py_DECREF(sysModule);

        // Register the in-process QuickJS JS-challenge provider *before*
        // importing yt_dlp_bridge, so it's active for the first extraction.
        PyObject *providerModule = PyImport_ImportModule("embedded_quickjs_provider");
        if (!providerModule) {
            failureMessage = [NSString stringWithFormat:@"import embedded_quickjs_provider failed: %@", DescribeCurrentPythonError()];
            ok = NO;
            return;
        }
        Py_DECREF(providerModule);

        PyObject *bridge = PyImport_ImportModule("yt_dlp_bridge");
        if (!bridge) {
            failureMessage = [NSString stringWithFormat:@"import yt_dlp_bridge failed: %@", DescribeCurrentPythonError()];
            ok = NO;
            return;
        }
        self.bridgeModule = bridge;

        PyObject *nativeSupport = PyImport_ImportModule("native_support");
        if (!nativeSupport) {
            failureMessage = [NSString stringWithFormat:@"import native_support failed: %@", DescribeCurrentPythonError()];
            ok = NO;
            return;
        }
        self.nativeSupportModule = nativeSupport;

        self.started = YES;
    }];

    if (!ok && error) {
        *error = MakePythonError(failureMessage ?: @"Unknown Python startup failure");
    }
    return ok;
}

// Calls a zero/one/two-arg bridge function that returns a JSON string, on
// the dedicated Python thread. `format`/varargs follow Py_BuildValue rules.
- (nullable NSString *)callBridgeFunction:(const char *)name error:(NSError **)error format:(nullable const char *)format, ... {
    __block NSString *resultString = nil;
    __block NSString *failureMessage = nil;

    // Py_VaBuildValue touches the Python C API (it can allocate objects),
    // so -- like every other Python call here -- it must run on the
    // dedicated Python thread, not whichever thread called this method
    // (RN's methodQueue thread has no Python thread state at all).
    va_list args;
    va_start(args, format);

    [self runSync:^{
        PyObject *pyArgs = format ? Py_VaBuildValue(format, args) : PyTuple_New(0);
        if (!pyArgs) {
            failureMessage = @"Failed to build Python arguments";
            return;
        }
        if (!self.started) {
            failureMessage = @"Python runtime not started";
            Py_DECREF(pyArgs);
            return;
        }
        PyObject *func = PyObject_GetAttrString(self.bridgeModule, name);
        if (!func) {
            failureMessage = [NSString stringWithFormat:@"yt_dlp_bridge.%s not found", name];
            Py_DECREF(pyArgs);
            return;
        }
        PyObject *result = PyObject_CallObject(func, pyArgs);
        Py_DECREF(func);
        Py_DECREF(pyArgs);
        if (!result) {
            failureMessage = DescribeCurrentPythonError();
            return;
        }
        const char *utf8 = PyUnicode_AsUTF8(result);
        if (utf8) {
            resultString = [NSString stringWithUTF8String:utf8];
        } else {
            failureMessage = @"yt_dlp_bridge did not return a string";
        }
        Py_DECREF(result);
    }];

    va_end(args);

    if (!resultString && error) {
        *error = MakePythonError(failureMessage ?: @"Unknown error calling yt_dlp_bridge");
    }
    return resultString;
}

- (nullable NSString *)inspectMedia:(NSString *)url error:(NSError **)error {
    return [self callBridgeFunction:"inspect_media" error:error format:"(s)", url.UTF8String];
}

- (nullable NSString *)inspectPlaylist:(NSString *)url error:(NSError **)error {
    return [self callBridgeFunction:"inspect_playlist" error:error format:"(s)", url.UTF8String];
}

- (nullable NSString *)previewAudio:(NSString *)url error:(NSError **)error {
    return [self callBridgeFunction:"preview_audio" error:error format:"(s)", url.UTF8String];
}

- (nullable NSString *)searchYoutube:(NSString *)query page:(NSInteger)page pageSize:(NSInteger)pageSize error:(NSError **)error {
    return [self callBridgeFunction:"search_youtube" error:error format:"(sii)", query.UTF8String, (int)page, (int)pageSize];
}

- (nullable NSString *)downloadAudio:(NSString *)url
                            outputDir:(NSString *)outputDir
                      progressHandler:(void (^)(NSString *, int64_t, int64_t, double))progressHandler
                       cancelHandler:(BOOL (^)(void))cancelHandler
                               error:(NSError **)error {
    // v1: a no-op Python callback (native_support.NullDownloadCallback) --
    // live progress ticks are a later refinement; the Downloads UI currently
    // derives progress from polling the growing file on disk instead. See
    // native_support.py.
    __block NSString *resultString = nil;
    __block NSString *failureMessage = nil;

    [self runSync:^{
        if (!self.started) {
            failureMessage = @"Python runtime not started";
            return;
        }
        PyObject *callbackClass = PyObject_GetAttrString(self.nativeSupportModule, "NullDownloadCallback");
        PyObject *callback = callbackClass ? PyObject_CallObject(callbackClass, NULL) : NULL;
        Py_XDECREF(callbackClass);
        if (!callback) {
            failureMessage = @"Could not construct NullDownloadCallback";
            return;
        }
        PyObject *func = PyObject_GetAttrString(self.bridgeModule, "download_audio");
        if (!func) {
            failureMessage = @"yt_dlp_bridge.download_audio not found";
            Py_DECREF(callback);
            return;
        }
        PyObject *result = PyObject_CallFunction(func, "ssO", url.UTF8String, outputDir.UTF8String, callback);
        Py_DECREF(func);
        Py_DECREF(callback);
        if (!result) {
            failureMessage = DescribeCurrentPythonError();
            return;
        }
        const char *utf8 = PyUnicode_AsUTF8(result);
        if (utf8) {
            resultString = [NSString stringWithUTF8String:utf8];
        } else {
            failureMessage = @"yt_dlp_bridge.download_audio did not return a string";
        }
        Py_DECREF(result);
    }];

    if (!resultString && error) {
        *error = MakePythonError(failureMessage ?: @"Unknown error calling download_audio");
    }
    return resultString;
}

@end
