package com.spendguard;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.WindowManager;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class PrivacyScreenModule extends ReactContextBaseJavaModule {

    private static final String PREFS_NAME = "SpendGuard_AppLock_v2";
    private static final String KEY_ENABLED = "app_lock_enabled";
    private static final String KEY_TIMEOUT = "app_lock_timeout";

    public PrivacyScreenModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "PrivacyScreenModule";
    }

    private SharedPreferences getPrefs() {
        return getReactApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @ReactMethod
    public void setSecure(final boolean secure) {
        final Activity activity = getCurrentActivity();
        if (activity != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (secure) {
                        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    } else {
                        activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    }
                }
            });
        }
    }

    @ReactMethod
    public void isAppLockEnabled(Promise promise) {
        try {
            boolean enabled = getPrefs().getBoolean(KEY_ENABLED, false);
            promise.resolve(enabled);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void setAppLockEnabled(final boolean enabled, Promise promise) {
        try {
            getPrefs().edit().putBoolean(KEY_ENABLED, enabled).apply();
            setSecure(enabled);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("PREFS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getAppLockTimeout(Promise promise) {
        try {
            String timeout = getPrefs().getString(KEY_TIMEOUT, "immediate");
            promise.resolve(timeout != null ? timeout : "immediate");
        } catch (Exception e) {
            promise.resolve("immediate");
        }
    }

    @ReactMethod
    public void setAppLockTimeout(String timeout, Promise promise) {
        try {
            getPrefs().edit().putString(KEY_TIMEOUT, timeout).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("PREFS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void resetForDevelopment(Promise promise) {
        try {
            getPrefs().edit().putBoolean(KEY_ENABLED, false).putString(KEY_TIMEOUT, "immediate").apply();
            setSecure(false);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }
}
