
// Node.js NAN binding for WASAPI capture
#include <nan.h>
#include "../audio/wasapi-capture.h"

static Nan::Persistent<v8::Function> audioCallback;

// Create WASAPI capture instance
NAN_METHOD(CreateCapture) {
    WASAPICapture* capture = createCapture();
    if (!capture) {
        Nan::ThrowError("Failed to create WASAPI capture");
        return;
    }
    
    info.GetReturnValue().Set(Nan::New<v8::External>(capture));
}

// Start audio capture
NAN_METHOD(StartCapture) {
    if (info.Length() < 1 || !info[0]->IsExternal()) {
        Nan::ThrowTypeError("Expected external capture object");
        return;
    }
    
    WASAPICapture* capture = static_cast<WASAPICapture*>(
        v8::Local<v8::External>::Cast(info[0])->Value()
    );
    
    bool result = startCapture(capture);
    info.GetReturnValue().Set(Nan::New(result));
}

// Stop audio capture
NAN_METHOD(StopCapture) {
    if (info.Length() < 1 || !info[0]->IsExternal()) {
        Nan::ThrowTypeError("Expected external capture object");
        return;
    }
    
    WASAPICapture* capture = static_cast<WASAPICapture*>(
        v8::Local<v8::External>::Cast(info[0])->Value()
    );
    
    stopCapture(capture);
}

// Destroy capture instance
NAN_METHOD(DestroyCapture) {
    if (info.Length() < 1 || !info[0]->IsExternal()) {
        Nan::ThrowTypeError("Expected external capture object");
        return;
    }
    
    WASAPICapture* capture = static_cast<WASAPICapture*>(
        v8::Local<v8::External>::Cast(info[0])->Value()
    );
    
    destroyCapture(capture);
}

// Set audio data callback
NAN_METHOD(SetAudioCallback) {
    if (info.Length() < 1 || !info[0]->IsFunction()) {
        Nan::ThrowTypeError("Expected callback function");
        return;
    }
    
    audioCallback.Reset(info[0].As<v8::Function>());
}

// Called from C++ audio capture thread
static void OnAudioData(unsigned char* data, int size) {
    if (!audioCallback.IsEmpty()) {
        Nan::HandleScope scope;
        v8::Local<v8::Value> argv[] = {
            Nan::CopyBuffer(reinterpret_cast<char*>(data), size).ToLocalChecked()
        };
        
        v8::Local<v8::Function> callback = Nan::New(audioCallback);
        Nan::AsyncResource resource("wasapi:audio_data");
        resource.runInAsyncScope(Nan::GetCurrentContext()->Global(), callback, 1, argv);
    }
}

// Initialize the module
NAN_MODULE_INIT(InitModule) {
    Nan::Set(target, Nan::New("createCapture").ToLocalChecked(),
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(CreateCapture)).ToLocalChecked());
    Nan::Set(target, Nan::New("startCapture").ToLocalChecked(),
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(StartCapture)).ToLocalChecked());
    Nan::Set(target, Nan::New("stopCapture").ToLocalChecked(),
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(StopCapture)).ToLocalChecked());
    Nan::Set(target, Nan::New("destroyCapture").ToLocalChecked(),
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(DestroyCapture)).ToLocalChecked());
    Nan::Set(target, Nan::New("setAudioCallback").ToLocalChecked(),
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(SetAudioCallback)).ToLocalChecked());
}

NODE_MODULE(wasapi_capture, InitModule)
