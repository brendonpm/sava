package com.savatablet.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Abre a Sava quando o tablet liga ou quando o cabo (energia/USB) é conectado. */
public class AutoStart extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        Intent open = new Intent(ctx, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        ctx.startActivity(open);
        MainActivity.wakeScreen(ctx);
    }
}
