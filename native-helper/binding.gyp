
{
  "targets": [
    {
      "target_name": "wasapi_capture",
      "conditions": [
        ["OS=='win'", {
          "sources": [
            "src/audio/wasapi-capture.cpp",
            "src/bindings/wasapi-binding.cpp"
          ],
          "include_dirs": [
            "<!(node -p \"require('nan')\")",
            "deps/opus/include"
          ],
          "libraries": [
            "ole32.lib",
            "oleaut32.lib", 
            "winmm.lib",
            "ksuser.lib"
          ],
          "defines": [
            "WIN32_LEAN_AND_MEAN",
            "NOMINMAX"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }]
      ]
    }
  ]
}
