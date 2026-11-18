package com.savatablet.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.view.MotionEvent;
import android.view.View;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

/**
 * Desenha a Sava e o painel de status. Os movimentos e partículas imitam os da extensão
 * (src/avatar/avatar.js), refeitos em Canvas porque o tablet não tem um navegador moderno.
 */
public class SavaView extends View {

    // ---- dados das expressões (assets/frames/index.txt, gerado por tools/export-frames.ps1) ----
    private static class Frame {
        String id, motion, particles, label;
        Bitmap bmp;
    }

    private final Map<String, Frame> frames = new HashMap<String, Frame>();

    // ---- estado ----
    private Frame cur, prev;
    private long changedAt;          // início da troca de expressão (crossfade + movimento)
    private float intensity = 1;
    private String text = "Conecte o cabo USB";
    private String detail = "Esperando o PC…";
    private String source = "";

    // Estado "base": para onde ela volta depois de uma reação temporária (hold).
    private String baseEmo = "neutro", baseText, baseDetail, baseSrc;
    private long holdUntil;
    private long lastEventAt;        // último evento vindo do PC (0 = nenhum ainda)
    private long lastActivityAt;     // último evento ou toque, para o modo ocioso
    private boolean sleeping;

    // Uso do PC (agente): some da tela se ficar 30 s sem atualizar.
    private int cpu = -1, ram = -1, gpu = -1, gpuTemp = -1, disk = -1, diskFree = -1;
    private long down = -1, up = -1;
    private String ramDetail = "", vramDetail = "";
    private final TextPaint barPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private long statsAt;
    private final long createdAt = SystemClock.uptimeMillis(); // dá 3 min de folga ao abrir
    private static final long STATS_STALE_MS = 30000;

    private static final long IDLE_MS = 60 * 1000L;
    private static final long SLEEP_MS = 5 * 60 * 1000L;
    private static final long FADE_MS = 180;
    private static final long PARTICLE_MS = 5000;

    // ---- partículas ----
    private static class Particle {
        String kind;
        float x, y, vx, vy, size, life, age, seed;
    }

    private final ArrayList<Particle> particles = new ArrayList<Particle>();
    private long lastSpawn, lastTick;
    private final Random rnd = new Random();

    // ---- desenho ----
    private boolean running;
    private final Paint bmpPaint = new Paint(Paint.FILTER_BITMAP_FLAG);
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final TextPaint srcPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private final TextPaint mainPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private final TextPaint detailPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private final TextPaint clockPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private final TextPaint smallPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fxText = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path path = new Path();
    private final RectF card = new RectF();
    private final Rect src = new Rect();
    private final RectF dst = new RectF();
    private StaticLayout mainLayout, detailLayout;
    private int layoutW = -1;
    private String layoutText, layoutDetail;
    private final SimpleDateFormat clock = new SimpleDateFormat("HH:mm", Locale.getDefault());
    private final float[] tf = new float[5]; // tx, ty, sx, sy, rot

    public SavaView(Context ctx) {
        super(ctx);
        loadFrames();
        long now = SystemClock.uptimeMillis();
        cur = frames.get("neutro");
        changedAt = now;
        lastActivityAt = now;
        baseText = text;
        baseDetail = detail;
        baseSrc = source;

        stroke.setStyle(Paint.Style.STROKE);
        srcPaint.setColor(0x99cfe6ea);
        srcPaint.setTypeface(Typeface.DEFAULT_BOLD);
        mainPaint.setColor(0xfff2f7f8);
        mainPaint.setTypeface(Typeface.DEFAULT_BOLD);
        detailPaint.setColor(0xbfd6e4e7);
        clockPaint.setColor(0xfff2f7f8);
        clockPaint.setTypeface(Typeface.DEFAULT_BOLD);
        smallPaint.setColor(0x99cfe6ea);
        fxText.setTypeface(Typeface.DEFAULT_BOLD);
        fxText.setTextAlign(Paint.Align.CENTER);
    }

    private void loadFrames() {
        try {
            InputStream is = getContext().getAssets().open("frames/index.txt");
            BufferedReader r = new BufferedReader(new InputStreamReader(is, "UTF-8"));
            String line;
            while ((line = r.readLine()) != null) {
                String[] c = line.split("\t", -1);
                if (c.length < 4 || c[0].length() == 0) continue;
                Frame f = new Frame();
                f.id = c[0];
                f.motion = c[1];
                f.particles = c[2];
                f.label = c[3];
                InputStream bi = getContext().getAssets().open("frames/" + f.id + ".png");
                BitmapFactory.Options o = new BitmapFactory.Options();
                o.inScaled = false;
                o.inPreferredConfig = Bitmap.Config.ARGB_8888;
                f.bmp = BitmapFactory.decodeStream(bi, null, o);
                bi.close();
                // Tela ldpi (120): sem isto o Android redimensiona o quadro e corta a imagem.
                if (f.bmp != null) f.bmp.setDensity(Bitmap.DENSITY_NONE);
                if (f.bmp != null) frames.put(f.id, f);
            }
            r.close();
        } catch (Exception e) {
            // Sem quadros o app ainda mostra o painel; o build sempre os inclui.
        }
    }

    // ------------------------------------------------------------------ eventos

    /** Chamado na thread da interface quando chega um /state do PC. */
    public void applyState(String emo, String newText, String newDetail, String src, long hold, int a) {
        long now = SystemClock.uptimeMillis();
        lastEventAt = now;
        lastActivityAt = now;
        sleeping = false;
        String t = newText != null ? newText : text;
        String d = newDetail != null ? newDetail : (newText != null ? "" : detail);
        String s = src != null ? src : source;
        if (hold > 0) {
            holdUntil = now + hold;
        } else if (holdUntil > now) {
            // Há uma reação temporária na tela (alerta, notificação, música, toque): ela fica até o fim.
            // O estado novo vira a base e aparece quando a reação acabar. Antes, um evento do Claude
            // Code chegando logo depois apagava o alerta de CPU na hora.
            if (emo != null && frames.containsKey(emo)) baseEmo = emo;
            baseText = t;
            baseDetail = d;
            baseSrc = s;
            return;
        } else {
            holdUntil = 0;
            baseEmo = emo != null && frames.containsKey(emo) ? emo : (cur != null ? cur.id : "neutro");
            baseText = t;
            baseDetail = d;
            baseSrc = s;
        }
        text = t;
        detail = d;
        source = s;
        if (emo != null) setEmotion(emo, a);
        invalidate();
    }

    /** Uso de CPU e RAM do PC (do agente). Não conta como atividade: não acorda a Sava. */
    /** Último contato do PC (evento ou CPU/RAM); usado para decidir se a tela fica acesa. */
    public long getLastContactAt() {
        return Math.max(Math.max(lastEventAt, statsAt), createdAt);
    }

    public void applyStats(Map<String, String> s) {
        cpu = (int) num(s, "cpu");
        ram = (int) num(s, "ram");
        gpu = (int) num(s, "gpu");
        gpuTemp = (int) num(s, "gpuTemp");
        disk = (int) num(s, "disk");
        diskFree = (int) num(s, "diskFree");
        down = num(s, "down");
        up = num(s, "up");
        ramDetail = pair(s.get("ramUsed"), s.get("ramTotal"));
        vramDetail = pair(s.get("vramUsed"), s.get("vramTotal"));
        if (statsAt == 0 && lastEventAt == 0 && holdUntil == 0) { // primeiro sinal do PC: sai do "Conecte o cabo"
            text = baseText = "Conectada ao PC";
            detail = baseDetail = "Esperando algo acontecer…";
        }
        statsAt = SystemClock.uptimeMillis();
    }

    private static long num(Map<String, String> s, String k) {
        String v = s.get(k);
        if (v == null) return -1;
        try { return Long.parseLong(v.trim()); } catch (NumberFormatException e) { return -1; }
    }

    private static String pair(String used, String total) {
        return used != null && total != null ? used + "/" + total + " GB" : "";
    }

    private void setEmotion(String id, int a) {
        Frame f = frames.get(id);
        if (f == null) return;
        long now = SystemClock.uptimeMillis();
        if (f != cur) prev = cur;
        cur = f;
        changedAt = now;
        intensity = a >= 1 && a <= 3 ? a : ("neutro".equals(id) ? 1 : 2);
        lastSpawn = 0;
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        if (e.getAction() == MotionEvent.ACTION_DOWN) {
            String[] emos = {"feliz", "piscadinha", "provocar", "vergonha", "apaixonada", "surpresa"};
            String[] lines = {"Ei! Isso faz cócegas!", "Oi, oi!", "Tá me cutucando, é?", "A-ah… oi.",
                    "Também gosto de você!", "Ai! Que susto!"};
            int i = rnd.nextInt(emos.length);
            long now = SystemClock.uptimeMillis();
            if (holdUntil == 0) { // guarda o estado atual como base antes da reação
                baseEmo = cur != null ? cur.id : "neutro";
                baseText = text;
                baseDetail = detail;
                baseSrc = source;
            }
            lastActivityAt = now;
            sleeping = false;
            holdUntil = now + 3500;
            text = lines[i];
            detail = "";
            setEmotion(emos[i], 2);
            invalidate();
            return true;
        }
        return super.onTouchEvent(e);
    }

    private void tickState(long now) {
        if (holdUntil > 0 && now >= holdUntil) {
            holdUntil = 0;
            text = baseText;
            detail = baseDetail;
            source = baseSrc;
            setEmotion(baseEmo, 1);
        }
        if (holdUntil == 0 && !sleeping) {
            long idle = now - lastActivityAt;
            if (idle > SLEEP_MS) {
                sleeping = true;
                text = "Zzz…";
                detail = "Toque para me acordar";
                setEmotion("sonolenta", 1);
            } else if (idle > IDLE_MS && cur != null && !"neutro".equals(cur.id)) {
                baseEmo = "neutro";
                baseText = lastEventAt > 0 ? "Esperando…" : baseText;
                baseDetail = "";
                text = baseText;
                detail = baseDetail;
                setEmotion("neutro", 1);
            }
        }
    }

    public void setRunning(boolean r) {
        running = r;
        if (r) {
            lastTick = SystemClock.uptimeMillis();
            invalidate();
        }
    }

    // ------------------------------------------------------------------ desenho

    @Override
    protected void onDraw(Canvas c) {
        long now = SystemClock.uptimeMillis();
        float dt = Math.min(0.1f, (now - lastTick) / 1000f);
        lastTick = now;
        tickState(now);

        int w = getWidth(), h = getHeight();
        float u = h / 444f; // unidade: a tela útil do GT7220S tem 800x444

        // fundo
        fill.setShader(new LinearGradient(0, 0, 0, h, 0xff24333c, 0xff141d23, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, fill);
        fill.setShader(null);

        // cartão da Sava
        float S = Math.min(h - 56 * u, w * 0.54f);
        float cx = w * 0.06f + S / 2;
        float bottom = (h + S) / 2;
        card.set(cx - S / 2, bottom - S, cx + S / 2, bottom);
        float k = S / 140f; // a extensão usa ~140 px; os movimentos em px são escalados por k

        float t = now - changedAt;
        computeMotion(cur != null ? cur.motion : "", t, intensity, k, now);

        c.save();
        c.translate(cx + tf[0], bottom + tf[1]);
        c.rotate(tf[4]);
        c.scale(tf[2], tf[3]);
        c.translate(-cx, -bottom);

        float r = S * 0.07f;
        fill.setColor(0x66000000);
        c.drawRoundRect(new RectF(card.left + 4 * u, card.top + 8 * u, card.right + 4 * u, card.bottom + 8 * u), r, r, fill);

        c.save();
        path.reset();
        path.addRoundRect(card, r, r, Path.Direction.CW);
        c.clipPath(path);
        fill.setColor(0xff3b98a2);
        c.drawRect(card, fill);
        float fade = Math.min(1f, t / (float) FADE_MS);
        if (prev != null && fade < 1f) drawFrame(c, prev, 255);
        if (cur != null) drawFrame(c, cur, (int) (255 * (prev != null ? fade : 1f)));
        if (fade >= 1f) prev = null;
        c.restore();

        stroke.setStrokeWidth(3 * u);
        stroke.setColor(0x2effffff);
        c.drawRoundRect(card, r, r, stroke);

        updateParticles(c, now, dt, S);
        c.restore();

        drawPanel(c, w, h, u, card.right + 34 * u, now);

        if (running) postInvalidateDelayed(33);
    }

    private void drawFrame(Canvas c, Frame f, int alpha) {
        src.set(0, 0, f.bmp.getWidth(), f.bmp.getHeight());
        dst.set(card);
        bmpPaint.setAlpha(alpha);
        c.drawBitmap(f.bmp, src, dst, bmpPaint);
    }

    private void drawPanel(Canvas c, int w, int h, float u, float x, long now) {
        int pw = (int) (w - x - 28 * u);
        if (pw < 50) return;
        srcPaint.setTextSize(15 * u);
        mainPaint.setTextSize(34 * u);
        detailPaint.setTextSize(20 * u);
        clockPaint.setTextSize(46 * u);
        smallPaint.setTextSize(15 * u);

        String t = clip(text, 90), d = clip(detail, 140);
        if (pw != layoutW || !eq(t, layoutText) || !eq(d, layoutDetail)) {
            layoutW = pw;
            layoutText = t;
            layoutDetail = d;
            mainLayout = new StaticLayout(t == null ? "" : t, mainPaint, pw, Layout.Alignment.ALIGN_NORMAL, 1.05f, 0, false);
            detailLayout = new StaticLayout(d == null ? "" : d, detailPaint, pw, Layout.Alignment.ALIGN_NORMAL, 1.1f, 0, false);
        }

        // Rodapé de baixo para cima: último contato, grade de uso do PC (se houver), rede, relógio.
        boolean hasStats = statsAt > 0 && now - statsAt < STATS_STALE_MS;
        float infoY = h - 14 * u;
        float row2 = h - 44 * u, row1 = h - 76 * u, netY = h - 106 * u;
        float clockY = hasStats ? h - 128 * u : h - 46 * u;
        float textBottom = clockY - 44 * u;

        // textos de estado (cortados para não invadir o rodapé)
        c.save();
        c.clipRect(x, 0, x + pw, textBottom);
        float y = 34 * u;
        if (source != null && source.length() > 0) {
            c.drawText(source.toUpperCase(Locale.getDefault()), x, y + 12 * u, srcPaint);
            y += 28 * u;
        }
        c.save();
        c.translate(x, y);
        mainLayout.draw(c);
        c.restore();
        y += mainLayout.getHeight() + 8 * u;
        c.save();
        c.translate(x, y);
        detailLayout.draw(c);
        c.restore();
        c.restore();

        // relógio e, ao lado, o nome da expressão
        String hhmm = clock.format(new Date());
        c.drawText(hhmm, x, clockY, clockPaint);
        String label = cur != null ? cur.label : "";
        float px = x + clockPaint.measureText(hhmm) + 16 * u;
        float lw = smallPaint.measureText(label);
        if (px + lw + 24 * u <= x + pw) {
            fill.setColor(0x33ffffff);
            c.drawRoundRect(new RectF(px, clockY - 30 * u, px + lw + 24 * u, clockY - 3 * u), 14 * u, 14 * u, fill);
            smallPaint.setColor(0xccf2f7f8);
            c.drawText(label, px + 12 * u, clockY - 11 * u, smallPaint);
        }

        if (hasStats) {
            // rede (esquerda) e temperatura da GPU (direita)
            barPaint.setTextSize(14 * u);
            barPaint.setColor(0xccf2f7f8);
            c.drawText("Rede", x, netY, barPaint);
            float nx = x + barPaint.measureText("Rede") + 10 * u;
            barPaint.setColor(0x99cfe6ea);
            c.drawText("↓ " + rate(down) + "   ↑ " + rate(up), nx, netY, barPaint);
            if (gpuTemp >= 0) {
                String tt = "GPU " + gpuTemp + " °C";
                barPaint.setColor(gpuTemp >= 85 ? 0xffff6b6b : (gpuTemp >= 75 ? 0xffffc857 : 0xccf2f7f8));
                c.drawText(tt, x + pw - barPaint.measureText(tt), netY, barPaint);
            }

            // grade 2x2: CPU | RAM / GPU | Disco
            float gap = 16 * u, cw = (pw - gap) / 2f;
            drawBar(c, "CPU", cpu, "", x, row1, cw, u);
            drawBar(c, "RAM", ram, ramDetail, x + cw + gap, row1, cw, u);
            drawBar(c, "GPU", gpu, vramDetail, x, row2, cw, u);
            drawBar(c, "Disco", disk, diskFree >= 0 ? diskFree + "G livres" : "", x + cw + gap, row2, cw, u);
        }

        boolean linked = lastEventAt > 0;
        fill.setColor(linked ? 0xff5fd38d : 0xff8a979c);
        c.drawCircle(x + 6 * u, infoY - 5 * u, 5 * u, fill);
        smallPaint.setColor(0x99cfe6ea);
        String info;
        if (!linked) info = "sem eventos do PC ainda";
        else {
            long min = (now - lastEventAt) / 60000;
            info = min < 1 ? "último evento agora" : "último evento há " + min + " min";
        }
        c.drawText(info, x + 18 * u, infoY, smallPaint);
    }

    private static String rate(long b) {
        if (b < 0) return "–";
        if (b < 1024) return b + " B/s";
        if (b < 1024 * 1024) return (b / 1024) + " KB/s";
        return String.format(Locale.US, "%.1f MB/s", b / 1048576f);
    }

    /** "CPU      34%" com uma barrinha embaixo: verde, amarela a partir de 70%, vermelha a partir de 90%. */
    private void drawBar(Canvas c, String name, int pct, String extra, float x, float y, float w, float u) {
        if (pct < 0) return;
        int p = Math.max(0, Math.min(100, pct));
        barPaint.setTextSize(14 * u);
        barPaint.setColor(0xccf2f7f8);
        c.drawText(name, x, y, barPaint);
        float nw = barPaint.measureText(name);
        String right = p + "%" + (extra.length() > 0 ? "  " + extra : "");
        if (nw + barPaint.measureText(right) + 6 * u > w) right = p + "%"; // sem espaço: só a porcentagem
        float rw = barPaint.measureText(right);
        barPaint.setColor(0x99cfe6ea);
        c.drawText(right, x + w - rw, y, barPaint);
        float top = y + 5 * u, h = 6 * u;
        fill.setColor(0x26ffffff);
        c.drawRoundRect(new RectF(x, top, x + w, top + h), h / 2, h / 2, fill);
        fill.setColor(p >= 90 ? 0xffff6b6b : (p >= 70 ? 0xffffc857 : 0xff5fd38d));
        c.drawRoundRect(new RectF(x, top, x + Math.max(h, w * p / 100f), top + h), h / 2, h / 2, fill);
    }

    private static String clip(String s, int n) {
        if (s == null || s.length() <= n) return s;
        return s.substring(0, n - 1) + "…";
    }

    private static boolean eq(String a, String b) {
        return a == null ? b == null : a.equals(b);
    }

    // ------------------------------------------------------------------ movimentos

    /** Interpola entre quadros-chave com suavização (como as @keyframes do CSS). */
    private static float kf(float p, float[] ts, float[] vs) {
        if (p <= ts[0]) return vs[0];
        for (int i = 1; i < ts.length; i++) {
            if (p <= ts[i]) {
                float q = (p - ts[i - 1]) / (ts[i] - ts[i - 1]);
                q = q * q * (3 - 2 * q);
                return vs[i - 1] + (vs[i] - vs[i - 1]) * q;
            }
        }
        return vs[vs.length - 1];
    }

    private void computeMotion(String m, float t, float a, float k, long now) {
        float tx = 0, ty = 0, sx = 1, sy = 1, rot = 0;
        if (m == null) m = "";
        if (m.equals("pop")) {
            float p = Math.min(1, t / 220f);
            float s = kf(p, new float[]{0, .6f, 1}, new float[]{.94f, 1.04f, 1});
            sx = sy = s;
        } else if (m.equals("hop")) {
            float p = Math.min(1, t / 600f);
            float[] ts = {0, .3f, .55f, .75f, 1};
            ty = kf(p, ts, new float[]{0, -7 * a, 0, -3 * a, 0});
            sx = kf(p, ts, new float[]{1, 1, 1.02f, 1, 1});
            sy = kf(p, ts, new float[]{1, 1, .97f, 1, 1});
        } else if (m.equals("jump")) {
            float p = Math.min(1, t / 600f);
            float[] ts = {0, .35f, .7f, 1};
            ty = kf(p, ts, new float[]{0, -12 * a, 0, 0});
            sx = kf(p, ts, new float[]{1.04f, .97f, 1.03f, 1});
            sy = kf(p, ts, new float[]{.94f, 1.04f, .96f, 1});
        } else if (m.equals("nod")) {
            float p = Math.min(1, t / 600f);
            ty = kf(p, new float[]{0, .35f, .7f, 1}, new float[]{0, 3, -1, 0});
        } else if (m.equals("shake")) {
            float p = Math.min(1, t / 450f);
            float[] ts = {0, .15f, .35f, .55f, .75f, 1};
            tx = kf(p, ts, new float[]{0, -3 * a, 3 * a, -3 * a, 3 * a, 0});
            rot = kf(p, ts, new float[]{0, -1, 1, -1, 1, 0});
        } else if (m.equals("shiver")) {
            float p = Math.min(1, t / 700f);
            if (p < 1) {
                int step = (int) (p * 10);
                tx = (step % 2 == 0 ? -1.5f : 1.5f) * a;
                sx = sy = .98f;
            }
        } else if (m.equals("shrink")) {
            float p = kf(Math.min(1, t / 500f), new float[]{0, 1}, new float[]{0, 1});
            ty = 2 * a * p;
            sx = sy = 1 - a * .025f * p;
        } else if (m.equals("sink")) {
            float p = kf(Math.min(1, t / 900f), new float[]{0, 1}, new float[]{0, 1});
            ty = 3 * a * p;
            sy = 1 - a * .012f * p;
        } else if (m.equals("tilt") || m.equals("tiltLeft")) {
            float p = Math.min(1, t / 450f);
            float v = kf(p, new float[]{0, .7f, 1}, new float[]{0, 1.15f, 1});
            rot = (m.equals("tilt") ? 3 : -3) * a * v;
        } else if (m.equals("puff")) {
            float p = Math.min(1, t / 500f);
            float v = kf(p, new float[]{0, .7f, 1}, new float[]{0, 1.15f, 1});
            ty = -2 * v;
            sx = sy = 1 + a * .02f * v;
        }
        // respiração contínua (bob): mais lenta dormindo
        float period = sleeping ? 5000f : 3200f;
        float b = (float) (0.5 - 0.5 * Math.cos(2 * Math.PI * (now % (long) period) / period));
        ty += -3 * b;
        sx *= 1 + .012f * b;
        sy *= 1 - .006f * b;

        tf[0] = tx * k;
        tf[1] = ty * k;
        tf[2] = sx;
        tf[3] = sy;
        tf[4] = rot * .6f; // o cartão aqui é bem maior que na web; o mesmo ângulo pareceria exagerado
    }

    // ------------------------------------------------------------------ partículas

    private int spawnEvery(String kind) {
        if (kind.equals("rain")) return 120;
        if (kind.equals("stars")) return 320;
        if (kind.equals("smoke")) return 350;
        if (kind.equals("hearts")) return 420;
        if (kind.equals("notes")) return 480;
        if (kind.equals("sweat")) return 750;
        if (kind.equals("zzz")) return 1100;
        if (kind.equals("sigh")) return 1200;
        return 1500; // question, exclaim
    }

    private void spawn(String kind) {
        if (particles.size() >= 24) return;
        Particle p = new Particle();
        p.kind = kind;
        p.seed = rnd.nextFloat() * 6.28f;
        p.life = 1.6f;
        if (kind.equals("notes")) {
            p.x = .72f + rnd.nextFloat() * .2f; p.y = .45f; p.vy = -.16f; p.size = .11f;
        } else if (kind.equals("stars")) {
            p.x = .08f + rnd.nextFloat() * .84f; p.y = .05f + rnd.nextFloat() * .35f; p.size = .035f + rnd.nextFloat() * .03f; p.life = .9f;
        } else if (kind.equals("hearts")) {
            p.x = .15f + rnd.nextFloat() * .7f; p.y = .85f; p.vy = -.2f; p.size = .045f + rnd.nextFloat() * .02f; p.life = 2f;
        } else if (kind.equals("sweat")) {
            p.x = .8f + rnd.nextFloat() * .08f; p.y = .28f; p.vy = .05f; p.size = .03f; p.life = 1.2f;
        } else if (kind.equals("rain")) {
            p.x = rnd.nextFloat(); p.y = -.05f; p.vy = .75f; p.size = .05f; p.life = 1.5f;
        } else if (kind.equals("smoke")) {
            p.x = .12f + rnd.nextFloat() * .2f; p.y = .18f; p.vy = -.09f; p.vx = -.02f; p.size = .03f; p.life = 1.4f;
        } else if (kind.equals("zzz")) {
            p.x = .76f; p.y = .32f; p.vy = -.07f; p.vx = .04f; p.size = .07f; p.life = 2.6f;
        } else if (kind.equals("question")) {
            p.x = .14f; p.y = .2f; p.size = .16f; p.life = 1.5f;
        } else if (kind.equals("exclaim")) {
            p.x = .13f; p.y = .2f; p.size = .17f; p.life = 1.5f;
        } else if (kind.equals("sigh")) {
            p.x = .52f; p.y = .74f; p.vx = -.13f; p.vy = -.02f; p.size = .025f; p.life = 1.4f;
        } else {
            return;
        }
        particles.add(p);
    }

    private void updateParticles(Canvas c, long now, float dt, float S) {
        String kind = cur != null ? cur.particles : "";
        boolean always = "zzz".equals(kind) || "rain".equals(kind);
        if (kind != null && kind.length() > 0 && (always || now - changedAt < PARTICLE_MS)) {
            if (now - lastSpawn >= spawnEvery(kind)) {
                spawn(kind);
                lastSpawn = now;
            }
        }
        Iterator<Particle> it = particles.iterator();
        while (it.hasNext()) {
            Particle p = it.next();
            p.age += dt;
            if (p.age >= p.life) { it.remove(); continue; }
            if (p.kind.equals("sweat")) p.vy += .5f * dt; // gota acelera
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            drawParticle(c, p, S);
        }
    }

    private void drawParticle(Canvas c, Particle p, float S) {
        float q = p.age / p.life;
        float alpha = q < .15f ? q / .15f : (q > .7f ? (1 - q) / .3f : 1);
        int A = (int) (255 * Math.max(0, Math.min(1, alpha)));
        float x = card.left + p.x * S, y = card.top + p.y * S, s = p.size * S;
        String k = p.kind;
        if (k.equals("notes")) {
            fxText.setColor(Color.argb(A, 255, 243, 176));
            fxText.setTextSize(s);
            c.drawText(((int) (p.seed * 10)) % 2 == 0 ? "♪" : "♫", x + (float) Math.sin(p.age * 5 + p.seed) * .03f * S, y, fxText);
        } else if (k.equals("stars")) {
            float tw = (float) Math.sin(q * Math.PI);
            star(c, x, y, s * (.4f + tw), Color.argb((int) (255 * tw), 255, 215, 94));
        } else if (k.equals("hearts")) {
            heart(c, x + (float) Math.sin(p.age * 3 + p.seed) * .025f * S, y, s, Color.argb(A, 255, 107, 154));
        } else if (k.equals("sweat") || k.equals("rain")) {
            drop(c, x, y, k.equals("rain") ? s * .45f : s, Color.argb((int) (A * (k.equals("rain") ? .75f : 1)), 124, 200, 255));
        } else if (k.equals("smoke")) {
            fill.setColor(Color.argb((int) (A * .55f), 200, 200, 205));
            c.drawCircle(x, y, s * (1 + q * 1.6f), fill);
        } else if (k.equals("zzz")) {
            fxText.setColor(Color.argb(A, 220, 235, 255));
            fxText.setTextSize(s * (0.8f + q));
            c.drawText("z", x, y, fxText);
        } else if (k.equals("question") || k.equals("exclaim")) {
            float bob = (float) Math.sin(p.age * 6) * .015f * S;
            fxText.setColor(Color.argb(A, k.equals("exclaim") ? 255 : 245, k.equals("exclaim") ? 210 : 245, k.equals("exclaim") ? 70 : 250));
            fxText.setTextSize(s);
            c.drawText(k.equals("exclaim") ? "!" : "?", x, y + bob, fxText);
        } else if (k.equals("sigh")) {
            fill.setColor(Color.argb((int) (A * .7f), 235, 245, 250));
            c.drawCircle(x, y, s * (1 + q), fill);
        }
    }

    private void star(Canvas c, float x, float y, float r, int color) {
        path.reset();
        path.moveTo(x, y - r);
        path.quadTo(x, y, x + r, y);
        path.quadTo(x, y, x, y + r);
        path.quadTo(x, y, x - r, y);
        path.quadTo(x, y, x, y - r);
        fill.setColor(color);
        c.drawPath(path, fill);
    }

    private void heart(Canvas c, float x, float y, float s, int color) {
        path.reset();
        path.moveTo(x, y + s);
        path.cubicTo(x - s * 1.6f, y, x - s * .8f, y - s * 1.1f, x, y - s * .35f);
        path.cubicTo(x + s * .8f, y - s * 1.1f, x + s * 1.6f, y, x, y + s);
        fill.setColor(color);
        c.drawPath(path, fill);
    }

    private void drop(Canvas c, float x, float y, float s, int color) {
        path.reset();
        path.moveTo(x, y - s);
        path.quadTo(x + s * .9f, y + s * .2f, x, y + s * .7f);
        path.quadTo(x - s * .9f, y + s * .2f, x, y - s);
        fill.setColor(color);
        c.drawPath(path, fill);
    }
}
