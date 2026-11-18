package com.track100.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 本地插件需在 super.onCreate 之前注册
        registerPlugin(ShortcutsPlugin.class);
        registerPlugin(DeviceSettingsPlugin.class);
        registerPlugin(Track100WidgetPlugin.class);
        registerPlugin(GallerySaverPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
