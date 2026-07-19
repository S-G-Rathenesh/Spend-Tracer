package com.spendguard;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import com.facebook.react.HeadlessJsTaskService;

public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        // We only care about SMS_RECEIVED. For some devices, other SMS actions might trigger this if not careful.
        if (intent.getAction().equals(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)) {
            SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
            if (messages != null && messages.length > 0) {
                StringBuilder bodyBuilder = new StringBuilder();
                String sender = messages[0].getOriginatingAddress();
                long timestamp = messages[0].getTimestampMillis();
                
                for (SmsMessage message : messages) {
                    bodyBuilder.append(message.getMessageBody());
                }

                String fullBody = bodyBuilder.toString();

                Intent serviceIntent = new Intent(context, SmsTaskService.class);
                serviceIntent.putExtra("sender", sender);
                serviceIntent.putExtra("body", fullBody);
                serviceIntent.putExtra("timestamp", (double) timestamp); // JS handles large numbers as double
                
                context.startService(serviceIntent);
                HeadlessJsTaskService.acquireWakeLockNow(context);
            }
        }
    }
}
