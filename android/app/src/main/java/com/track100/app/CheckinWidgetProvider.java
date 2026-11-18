package com.track100.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

/**
 * 桌面打卡小组件。
 *
 * <p>数据不放在 widget 里，统一走 {@link WidgetPrefs} 中转：
 * 点击 "+step" → 追加一条 pending_checkins 并乐观递增本地 current → 刷新 UI，
 * App 启动/回前台时由 JS 调 drainPending 落地到 localStorage。</p>
 */
public class CheckinWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_CHECKIN = "com.track100.app.WIDGET_CHECKIN";
    public static final String EXTRA_GOAL_ID = "goalId";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        super.onUpdate(context, manager, appWidgetIds);
        RemoteViews views = buildViews(context);
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, views);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_CHECKIN.equals(intent.getAction())) {
            String goalId = intent.getStringExtra(EXTRA_GOAL_ID);
            if (goalId != null) {
                handleCheckin(context, goalId);
            }
            return;
        }
        super.onReceive(context, intent);
    }

    /** 供 Capacitor 插件在 syncGoals 后主动刷新桌面组件。 */
    public static void updateWidget(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, CheckinWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids.length == 0) {
            return;
        }
        manager.updateAppWidget(provider, buildViews(context));
    }

    /** 根据 SharedPreferences 中的目标列表构造 RemoteViews。 */
    public static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_checkin);
        views.removeAllViews(R.id.widget_rows);

        JSONArray goals = WidgetPrefs.getGoals(context);
        if (goals.length() == 0) {
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            return views;
        }
        views.setViewVisibility(R.id.widget_empty, View.GONE);

        int count = Math.min(goals.length(), WidgetPrefs.MAX_GOALS);
        for (int i = 0; i < count; i++) {
            JSONObject goal = goals.optJSONObject(i);
            if (goal == null) {
                continue;
            }
            String goalId = goal.optString("id", "");
            String title = goal.optString("title", "");
            if (title.isEmpty()) {
                title = "目标 " + (i + 1);
            }
            String icon = goal.optString("icon", "🎯");
            if (icon.isEmpty()) {
                icon = "🎯";
            }
            double step = Math.max(0, goal.optDouble("step", 1));
            double current = goal.optDouble("current", 0);
            double target = goal.optDouble("target", 0);

            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_goal_row);
            row.setTextViewText(R.id.goal_icon, icon);
            row.setTextViewText(R.id.goal_title, title);
            row.setTextViewText(R.id.goal_progress, fmtNum(current) + "/" + fmtNum(target));
            row.setTextViewText(R.id.goal_add, "+" + fmtNum(step));

            Intent click = new Intent(context, CheckinWidgetProvider.class)
                    .setAction(ACTION_CHECKIN)
                    .putExtra(EXTRA_GOAL_ID, goalId);
            // minSdk 22：FLAG_IMMUTABLE 自 API 23 才有，编译时常量会内联，运行时按版本加。
            int flags = PendingIntent.FLAG_UPDATE_CURRENT
                    | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
            // requestCode 用行下标区分每个目标的 PendingIntent。
            row.setOnClickPendingIntent(R.id.goal_add,
                    PendingIntent.getBroadcast(context, i, click, flags));

            views.addView(R.id.widget_rows, row);
        }
        return views;
    }

    /** 数字格式化：整数不带小数点，小数最多保留两位。 */
    private static String fmtNum(double v) {
        if (v == Math.rint(v)) {
            return String.valueOf((long) v);
        }
        return String.valueOf(Math.round(v * 100) / 100.0);
    }

    /** 点击处理：记一条待消费记录 + 本地乐观更新 + 刷新。 */
    private static void handleCheckin(Context context, String goalId) {
        double step = 1;
        JSONArray goals = WidgetPrefs.getGoals(context);
        for (int i = 0; i < goals.length(); i++) {
            JSONObject goal = goals.optJSONObject(i);
            if (goal != null && goalId.equals(goal.optString("id"))) {
                step = Math.max(0, goal.optDouble("step", 1));
                break;
            }
        }
        if (step <= 0) {
            step = 1;
        }

        JSONObject entry = new JSONObject();
        try {
            entry.put("id", UUID.randomUUID().toString());
            entry.put("goalId", goalId);
            entry.put("value", step);
            entry.put("ts", System.currentTimeMillis());
        } catch (JSONException ignored) {
            // 写入的都是基本类型，不会抛异常
        }

        WidgetPrefs.appendPending(context, entry);
        WidgetPrefs.incrementLocal(context, goalId, step);
        updateWidget(context);
    }
}
