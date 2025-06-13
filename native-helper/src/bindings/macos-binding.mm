#include <node.h>
#include <node_buffer.h>
#include <uv.h>

using namespace v8;

// Forward declarations from Swift
extern "C" {
    void* createMacOSCapture();
    bool initializeMacOSCapture(void* capture);
    bool startMacOSCapture(void* capture);
    void stopMacOSCapture(void* capture);
    void setMacOSAudioCallback(void* capture, void (*callback)(const unsigned char*, int));
    void destroyMacOSCapture(void* capture);
}

struct AudioCallbackData {
    Persistent<Function> callback;
    uv_async_t async;
    unsigned char* audioData;
    int audioSize;
    bool hasData;
    uv_mutex_t mutex;
};

static AudioCallbackData* g_callbackData = nullptr;

// UV async callback to call JavaScript from worker thread
void audioDataAsyncCallback(uv_async_t* async) {
    Isolate* isolate = Isolate::GetCurrent();
    HandleScope scope(isolate);
    
    AudioCallbackData* data = static_cast<AudioCallbackData*>(async->data);
    
    uv_mutex_lock(&data->mutex);
    if (data->hasData && !data->callback.IsEmpty()) {
        Local<Function> callback = Local<Function>::New(isolate, data->callback);
        Local<Context> context = isolate->GetCurrentContext();
        
        // Create Node.js Buffer from audio data
        Local<Object> buffer = node::Buffer::Copy(
            isolate, 
            reinterpret_cast<char*>(data->audioData), 
            data->audioSize
        ).ToLocalChecked();
        
        Local<Value> argv[] = { buffer };
        
        callback->Call(context, Null(isolate), 1, argv).ToLocalChecked();
        
        delete[] data->audioData;
        data->audioData = nullptr;
        data->hasData = false;
    }
    uv_mutex_unlock(&data->mutex);
}

// C callback from Swift
extern "C" void macOSAudioCallback(const unsigned char* audioData, int size) {
    if (!g_callbackData) return;
    
    uv_mutex_lock(&g_callbackData->mutex);
    
    // Copy audio data (will be freed in async callback)
    g_callbackData->audioData = new unsigned char[size];
    memcpy(g_callbackData->audioData, audioData, size);
    g_callbackData->audioSize = size;
    g_callbackData->hasData = true;
    
    uv_mutex_unlock(&g_callbackData->mutex);
    
    // Trigger async callback
    uv_async_send(&g_callbackData->async);
}

// JavaScript exports
void CreateMacOSCapture(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    void* capture = createMacOSCapture();
    if (!capture) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Failed to create macOS capture").ToLocalChecked()
        ));
        return;
    }
    
    // Initialize the capture
    if (!initializeMacOSCapture(capture)) {
        destroyMacOSCapture(capture);
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Failed to initialize macOS capture").ToLocalChecked()
        ));
        return;
    }
    
    // Wrap native pointer
    Local<External> external = External::New(isolate, capture);
    args.GetReturnValue().Set(external);
}

void StartMacOSCapture(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (args.Length() < 1 || !args[0]->IsExternal()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Invalid arguments").ToLocalChecked()
        ));
        return;
    }
    
    void* capture = Local<External>::Cast(args[0])->Value();
    
    bool success = startMacOSCapture(capture);
    args.GetReturnValue().Set(Boolean::New(isolate, success));
}

void StopMacOSCapture(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (args.Length() < 1 || !args[0]->IsExternal()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Invalid arguments").ToLocalChecked()
        ));
        return;
    }
    
    void* capture = Local<External>::Cast(args[0])->Value();
    stopMacOSCapture(capture);
}

void DestroyMacOSCapture(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (args.Length() < 1 || !args[0]->IsExternal()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Invalid arguments").ToLocalChecked()
        ));
        return;
    }
    
    void* capture = Local<External>::Cast(args[0])->Value();
    destroyMacOSCapture(capture);
}

void SetMacOSAudioCallback(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (args.Length() < 2 || !args[0]->IsExternal() || !args[1]->IsFunction()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Invalid arguments").ToLocalChecked()
        ));
        return;
    }
    
    void* capture = Local<External>::Cast(args[0])->Value();
    
    // Initialize callback data if not already done
    if (!g_callbackData) {
        g_callbackData = new AudioCallbackData();
        g_callbackData->hasData = false;
        g_callbackData->audioData = nullptr;
        uv_mutex_init(&g_callbackData->mutex);
        
        // Initialize async handle
        g_callbackData->async.data = g_callbackData;
        uv_async_init(uv_default_loop(), &g_callbackData->async, audioDataAsyncCallback);
    }
    
    // Store JavaScript callback
    Local<Function> callback = Local<Function>::Cast(args[1]);
    g_callbackData->callback.Reset(isolate, callback);
    
    // Set the callback in Swift
    setMacOSAudioCallback(capture, macOSAudioCallback);
}

// Module initialization
void Initialize(Local<Object> exports) {
    NODE_SET_METHOD(exports, "createMacOSCapture", CreateMacOSCapture);
    NODE_SET_METHOD(exports, "startMacOSCapture", StartMacOSCapture);
    NODE_SET_METHOD(exports, "stopMacOSCapture", StopMacOSCapture);
    NODE_SET_METHOD(exports, "destroyMacOSCapture", DestroyMacOSCapture);
    NODE_SET_METHOD(exports, "setAudioCallback", SetMacOSAudioCallback);
}

NODE_MODULE(macos_capture, Initialize)