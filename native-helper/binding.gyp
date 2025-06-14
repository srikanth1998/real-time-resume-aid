
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
            "<!(node -e \"console.log(require('nan'))\")",
            "deps/opus/include",
            "<!(node -p \"require('path').join(process.cwd(), 'deps', 'opus', 'include')\")"
          ],
          "libraries": [
            "-lole32",
            "-loleaut32",
            "-lwinmm",
            "-lksuser",
            "<!(node -p \"require('path').join(process.cwd(), 'deps', 'opus', 'lib', 'opus.lib')\")"
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
    },
    {
      "target_name": "macos_capture",
      "conditions": [
        ["OS=='mac'", {
          "sources": [
            "src/audio/macos-capture.swift",
            "src/bindings/macos-binding.mm"
          ],
          "include_dirs": [
            "<!(node -e \"console.log(require('nan'))\")",
            "deps/opus/include",
            "<!(node -p \"require('path').join(process.cwd(), 'deps', 'opus', 'include')\")"
          ],
          "libraries": [
            "-framework AVFoundation",
            "-framework AudioToolbox",
            "-framework CoreAudio",
            "<!(node -p \"require('path').join(process.cwd(), 'deps', 'opus', 'lib', 'libopus.a')\")"
          ],
          "xcode_settings": {
            "SWIFT_VERSION": "5.0",
            "CLANG_ENABLE_OBJC_ARC": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "10.15"
          }
        }]
      ]
    }
  ]
}
