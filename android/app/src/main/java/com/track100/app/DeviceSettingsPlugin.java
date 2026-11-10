package com.track100.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 每日提醒自检所需的系统信息与设置入口。
 * 国产 ROM 的电池优化会冻结 AlarmManager,是「设了不提醒」最常见的原因之一,
 * JS 侧拿不到这个状态,也没有标准的设置页 Intent,所以放在本地插件里。
 */
@CapacitorPlugin(name = "DeviceSettings")
public class DeviceSettingsPlugin extends Plugin {

    @PluginMethod
    public void diagnostics(PluginCall call) {
        JSObject result = new JSObject();
        result.put("batteryOptimized", isBatteryOptimized());
        call.resolve(result);
    }

    /** 应用通知设置页;部分 ROM 缺失时退回应用详情页。 */
    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:" + getContext().getPackageName()));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
            } catch (Exception ignored) {
                // 没有可用页面:忽略,用户可自行到系统设置里找
            }
        }
        call.resolve();
    }

    /** 电池优化白名单列表(让用户自己把 Track100 设为「不优化」)。 */
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception ignored) {
            // 部分 ROM 没有该页面
        }
        call.resolve();
    }

    private boolean isBatteryOptimized() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && !pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }
}
