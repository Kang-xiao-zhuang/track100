package com.track100.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

/**
 * 桌面小组件与 JS 层的桥接插件（插件名：Track100Widget）。
 *
 * <p>注意 Capacitor 的 {@code @PluginMethod} 必须是
 * {@code public void method(PluginCall call)} 形式，不能直接把 JSArray 当参数、
 * 也不能直接返回 JSArray；JS 侧按对象传参，结果通过 {@code call.resolve} 回传。</p>
 */
@CapacitorPlugin(name = "Track100Widget")
public class Track100WidgetPlugin extends Plugin {

    /**
     * JS: Track100Widget.syncGoals({ goals: [...], options: {...} })
     * 写入 widget_goals 并立即刷新桌面组件。
     */
    @PluginMethod
    public void syncGoals(PluginCall call) {
        JSArray goals = call.getArray("goals", new JSArray());
        // options 为前端预留（例如后续控制是否刷新）；当前不依赖其取值。
        call.getObject("options");

        WidgetPrefs.saveGoals(getContext(), goals);
        CheckinWidgetProvider.updateWidget(getContext());

        JSObject result = new JSObject();
        result.put("count", Math.min(goals.length(), WidgetPrefs.MAX_GOALS));
        call.resolve(result);
    }

    /**
     * JS: const { items } = await Track100Widget.drainPending()
     * 读取并清空 pending_checkins，交给 JS 落地 localStorage。
     * 每项：{ id, goalId, value, ts }。
     */
    @PluginMethod
    public void drainPending(PluginCall call) {
        JSONArray pending = WidgetPrefs.drainPending(getContext());
        JSArray items = new JSArray();
        for (int i = 0; i < pending.length(); i++) {
            items.put(pending.opt(i));
        }
        JSObject result = new JSObject();
        result.put("items", items);
        call.resolve(result);
    }
}
