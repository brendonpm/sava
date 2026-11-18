package com.savatablet.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.PowerManager;
import android.os.SystemClock;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

/**
 * Tela cheia com a Sava; recebe os eventos do PC pela porta local (via adb forward).
 *
 * Tela: fica acesa só enquanto o tablet está no cabo E o PC dá sinal de vida (o agente manda CPU/RAM
 * a cada 5 s). Sem sinal por 3 min (PC desligado ou em suspensão) ou sem cabo, o app solta a tela e o
 * Android apaga no tempo normal. Quando o sinal volta, a tela acende sozinha.
 */
public class MainActivity extends Activity {
    public static final int PORT = 47800;
    private static final long PC_TIMEOUT_MS = 3 * 60 * 1000L;
    private static final long CHECK_MS = 5000;

    private SavaView sava;
    private CommandServer server;
    private final Handler handler = new Handler();
    private boolean keepOn = true;

    private final Runnable watchdog = new Runnable() {
        public void run() {
            checkScreen();
            handler.postDelayed(this, CHECK_MS);
        }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        sava = new SavaView(this);
        setContentView(sava);
        dimSystemBar();

        server = new CommandServer(PORT, sava);
        server.start();
        handler.postDelayed(watchdog, CHECK_MS);
    }

    private void checkScreen() {
        boolean pcAlive = SystemClock.uptimeMillis() - sava.getLastContactAt() < PC_TIMEOUT_MS;
        boolean want = pcAlive && isCharging();
        if (want == keepOn) return;
        keepOn = want;
        if (want) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            wakeScreen(this);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }

    private boolean isCharging() {
        Intent b = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        return b != null && b.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0;
    }

    /** Acende a tela (se estiver apagada); depois o FLAG_KEEP_SCREEN_ON a mantém acesa. */
    @SuppressWarnings("deprecation")
    static void wakeScreen(Context ctx) {
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        if (pm == null || pm.isScreenOn()) return;
        PowerManager.WakeLock wl = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE, "sava:wake");
        wl.acquire(5000);
    }

    private void dimSystemBar() {
        // No Android 4.0 a barra do sistema do tablet não pode sumir; dá para deixá-la apagada.
        sava.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LOW_PROFILE);
    }

    @Override
    protected void onResume() {
        super.onResume();
        dimSystemBar();
        sava.setRunning(true);
    }

    @Override
    protected void onPause() {
        sava.setRunning(false);
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(watchdog);
        server.shutdown();
        super.onDestroy();
    }
}
