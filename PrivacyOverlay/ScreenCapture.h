#pragma once

#include <windows.h>
#include <gdiplus.h>
#include <string>
#pragma comment(lib, "gdiplus.lib")

class ScreenCapture {
public:
    // Initialize GDI+
    static bool Initialize() {
        Gdiplus::GdiplusStartupInput gdiplusStartupInput;
        ULONG_PTR gdiplusToken;
        return Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL) == Gdiplus::Ok;
    }

    // Capture entire screen
    static bool CaptureScreen(const std::wstring& filePath) {
        // Get desktop DC
        HDC hdcScreen = GetDC(NULL);
        HDC hdcMemDC = CreateCompatibleDC(hdcScreen);
        
        // Get screen dimensions
        int screenWidth = GetSystemMetrics(SM_CXSCREEN);
        int screenHeight = GetSystemMetrics(SM_CYSCREEN);
        
        // Create compatible bitmap
        HBITMAP hbmScreen = CreateCompatibleBitmap(hdcScreen, screenWidth, screenHeight);
        SelectObject(hdcMemDC, hbmScreen);
        
        // Copy screen to bitmap
        BitBlt(hdcMemDC, 0, 0, screenWidth, screenHeight, hdcScreen, 0, 0, SRCCOPY);
        
        // Save bitmap to file
        bool result = SaveBitmap(hbmScreen, filePath);
        
        // Clean up
        DeleteObject(hbmScreen);
        DeleteDC(hdcMemDC);
        ReleaseDC(NULL, hdcScreen);
        
        return result;
    }

    // Capture active window
    static bool CaptureActiveWindow(const std::wstring& filePath) {
        // Get foreground window
        HWND hWnd = GetForegroundWindow();
        if (hWnd == NULL) return false;
        
        // Get window dimensions
        RECT rect;
        GetWindowRect(hWnd, &rect);
        int width = rect.right - rect.left;
        int height = rect.bottom - rect.top;
        
        // Get DCs
        HDC hdcScreen = GetDC(NULL);
        HDC hdcMemDC = CreateCompatibleDC(hdcScreen);
        
        // Create compatible bitmap
        HBITMAP hbmScreen = CreateCompatibleBitmap(hdcScreen, width, height);
        SelectObject(hdcMemDC, hbmScreen);
        
        // Copy window to bitmap
        BitBlt(hdcMemDC, 0, 0, width, height, hdcScreen, rect.left, rect.top, SRCCOPY);
        
        // Save bitmap to file
        bool result = SaveBitmap(hbmScreen, filePath);
        
        // Clean up
        DeleteObject(hbmScreen);
        DeleteDC(hdcMemDC);
        ReleaseDC(NULL, hdcScreen);
        
        return result;
    }

private:
    // Save bitmap to file using GDI+
    static bool SaveBitmap(HBITMAP hBitmap, const std::wstring& filePath) {
        // Get bitmap info
        BITMAP bm;
        GetObject(hBitmap, sizeof(bm), &bm);
        
        // Create Bitmap object
        Gdiplus::Bitmap bitmap(hBitmap, NULL);
        
        // Determine encoder based on file extension
        CLSID encoderClsid;
        GetEncoderClsid(L"image/png", &encoderClsid);
        
        // Save to file
        return bitmap.Save(filePath.c_str(), &encoderClsid, NULL) == Gdiplus::Ok;
    }

    // Helper function to get encoder CLSID
    static int GetEncoderClsid(const WCHAR* format, CLSID* pClsid) {
        UINT num = 0;
        UINT size = 0;
        
        Gdiplus::ImageCodecInfo* pImageCodecInfo = NULL;
        
        Gdiplus::GetImageEncodersSize(&num, &size);
        if (size == 0) return -1;
        
        pImageCodecInfo = (Gdiplus::ImageCodecInfo*)(malloc(size));
        if (pImageCodecInfo == NULL) return -1;
        
        Gdiplus::GetImageEncoders(num, size, pImageCodecInfo);
        
        for (UINT j = 0; j < num; ++j) {
            if (wcscmp(pImageCodecInfo[j].MimeType, format) == 0) {
                *pClsid = pImageCodecInfo[j].Clsid;
                free(pImageCodecInfo);
                return j;
            }
        }
        
        free(pImageCodecInfo);
        return -1;
    }
};
