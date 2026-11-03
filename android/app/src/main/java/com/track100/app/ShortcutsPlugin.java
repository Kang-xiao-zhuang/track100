package com.track100.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;

import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * 桌面长按图标的「快捷打卡」。
 * JS 调 set() 下发目标列表;用户点快捷方式 → 发 "checkin" 事件给 JS(App 未启动时保留到 JS 监听为止)。
 */
@CapacitorPlugin(name = "Shortcuts")
public class ShortcutsPlugin extends Plugin {

    private static final String ACTION_CHECKIN = "com.track100.app.CHECKIN";
    private static final String EXTRA_GOAL_ID = "goalId";
    private static final int ICON_SIZE = 192;

    @Override
    public void load() {
        dispatch(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        dispatch(intent);
    }

    private void dispatch(Intent intent) {
        if (intent == null || !ACTION_CHECKIN.equals(intent.getAction())) return;
        String goalId = intent.getStringExtra(EXTRA_GOAL_ID);
        // 清掉 action,避免 Activity 重建时同一个快捷方式被重复打卡
        intent.setAction(null);
        if (goalId == null) return;
        JSObject data = new JSObject();
        data.put("goalId", goalId);
        notifyListeners("checkin", data, true);
    }

    @PluginMethod
    public void set(PluginCall call) {
        JSArray items = call.getArray("items", new JSArray());
        Context ctx = getContext();
        int max = ShortcutManagerCompat.getMaxShortcutCountPerActivity(ctx);
        List<ShortcutInfoCompat> shortcuts = new ArrayList<>();
        try {
            for (int i = 0; i < items.length() && shortcuts.size() < max; i++) {
                JSONObject item = items.getJSONObject(i);
                String id = item.getString("id");
                Intent intent = new Intent(ctx, MainActivity.class)
                        .setAction(ACTION_CHECKIN)
                        .putExtra(EXTRA_GOAL_ID, id);
                shortcuts.add(new ShortcutInfoCompat.Builder(ctx, id)
                        .setShortLabel(item.getString("shortLabel"))
                        .setLongLabel(item.getString("longLabel"))
                        .setIcon(IconCompat.createWithBitmap(emojiIcon(item.optString("icon"), item.optString("color"))))
                        .setIntent(intent)
                        .build());
            }
        } catch (JSONException e) {
            call.reject("Invalid shortcut item", e);
            return;
        }
        ShortcutManagerCompat.setDynamicShortcuts(ctx, shortcuts);
        call.resolve();
    }

    /** 目标颜色的浅色圆底 + emoji。 */
    private static Bitmap emojiIcon(String emoji, String color) {
        Bitmap bitmap = Bitmap.createBitmap(ICON_SIZE, ICON_SIZE, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        float c = ICON_SIZE / 2f;

        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setColor(Color.WHITE);
        canvas.drawCircle(c, c, c, bg);
        bg.setColor(parseColor(color));
        bg.setAlpha(60);
        canvas.drawCircle(c, c, c, bg);

        Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
        text.setTextSize(ICON_SIZE * 0.5f);
        text.setTextAlign(Paint.Align.CENTER);
        Paint.FontMetrics fm = text.getFontMetrics();
        canvas.drawText(emoji, c, c - (fm.ascent + fm.descent) / 2f, text);
        return bitmap;
    }

    private static int parseColor(String color) {
        try {
            return Color.parseColor(color);
        } catch (IllegalArgumentException e) {
            return Color.parseColor("#556B2F");
        }
    }
}
