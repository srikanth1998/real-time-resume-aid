
// Node.js N-API binding for WASAPI capture
#include <napi.h>
#include "../audio/wasapi-capture.cpp"
#include <functional>

class WASAPIBinding {
private:
    static Napi::FunctionReference audioCallback;
    static WASAPICapture* capture;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        exports.Set("createCapture", Napi::Function::New(env, CreateCapture));
        exports.Set("startCapture", Napi::Function::New(env, StartCapture));
        exports.Set("stopCapture", Napi::Function::New(env, StopCapture));
        exports.Set("destroyCapture", Napi::Function::New(env, DestroyCapture));
        exports.Set("setAudioCallback", Napi::Function::New(env, SetAudioCallback));
        return exports;
    }

    static Napi::Value CreateCapture(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        capture = createCapture();
        if (!capture) {
            Napi::TypeError::New(env, "Failed to create WASAPI capture").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        return Napi::External<WASAPICapture>::New(env, capture);
    }

    static Napi::Value StartCapture(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsExternal()) {
            Napi::TypeError::New(env, "Expected external capture object").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        
        WASAPICapture* capture = info[0].As<Napi::External<WASAPICapture>>().Data();
        bool result = startCapture(capture);
        
        return Napi::Boolean::New(env, result);
    }

    static Napi::Value StopCapture(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsExternal()) {
            Napi::TypeError::New(env, "Expected external capture object").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        
        WASAPICapture* capture = info[0].As<Napi::External<WASAPICapture>>().Data();
        stopCapture(capture);
        
        return env.Undefined();
    }

    static Napi::Value DestroyCapture(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsExternal()) {
            Napi::TypeError::New(env, "Expected external capture object").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        
        WASAPICapture* capture = info[0].As<Napi::External<WASAPICapture>>().Data();
        destroyCapture(capture);
        
        return env.Undefined();
    }

    static Napi::Value SetAudioCallback(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsFunction()) {
            Napi::TypeError::New(env, "Expected callback function").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        
        audioCallback = Napi::Persistent(info[0].As<Napi::Function>());
        return env.Undefined();
    }

    // Called from C++ audio capture thread
    static void OnAudioData(unsigned char* data, int size) {
        if (!audioCallback.IsEmpty()) {
            Napi::Env env = audioCallback.Env();
            Napi::Buffer<unsigned char> buffer = Napi::Buffer<unsigned char>::Copy(env, data, size);
            audioCallback.Call({buffer});
        }
    }
};

Napi::FunctionReference WASAPIBinding::audioCallback;
WASAPICapture* WASAPIBinding::capture = nullptr;

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    return WASAPIBinding::Init(env, exports);
}

NODE_API_MODULE(wasapi_capture, InitModule)
