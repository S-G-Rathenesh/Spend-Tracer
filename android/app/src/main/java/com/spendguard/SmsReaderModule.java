package com.spendguard;

import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Telephony;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class SmsReaderModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public SmsReaderModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SmsReaderModule";
    }

    @ReactMethod
    public void readSmsInbox(double sinceTimestamp, Promise promise) {
        try {
            ContentResolver cr = reactContext.getContentResolver();
            Uri uri = Telephony.Sms.Inbox.CONTENT_URI;
            
            // Query inbox. Note: we sort by date ASC so that we process older SMS first when rebuilding history.
            String selection = null;
            String[] selectionArgs = null;
            
            if (sinceTimestamp > 0) {
                selection = Telephony.Sms.DATE + " > ?";
                selectionArgs = new String[]{ String.valueOf((long) sinceTimestamp) };
            }

            Cursor cursor = cr.query(uri, 
                new String[]{Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE}, 
                selection, selectionArgs, 
                Telephony.Sms.DATE + " ASC");

            WritableArray messages = Arguments.createArray();

            if (cursor != null) {
                int indexId = cursor.getColumnIndex(Telephony.Sms._ID);
                int indexAddress = cursor.getColumnIndex(Telephony.Sms.ADDRESS);
                int indexBody = cursor.getColumnIndex(Telephony.Sms.BODY);
                int indexDate = cursor.getColumnIndex(Telephony.Sms.DATE);

                while (cursor.moveToNext()) {
                    WritableMap message = Arguments.createMap();
                    message.putString("id", cursor.getString(indexId));
                    message.putString("sender", cursor.getString(indexAddress));
                    message.putString("body", cursor.getString(indexBody));
                    message.putDouble("timestamp", cursor.getLong(indexDate));
                    messages.pushMap(message);
                }
                cursor.close();
            }

            promise.resolve(messages);
        } catch (Exception e) {
            promise.reject("SMS_READ_ERROR", e);
        }
    }
}
