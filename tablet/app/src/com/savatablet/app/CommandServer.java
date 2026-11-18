package com.savatablet.app;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.HashMap;
import java.util.Map;

/**
 * Servidor HTTP mínimo, só em 127.0.0.1 (nada fica exposto no Wi-Fi). O PC chega até ele pelo
 * cabo com "adb forward tcp:47800 tcp:47800".
 *
 *   GET /ping                                  -> "sava ok"
 *   GET /state?emo=feliz&text=Pronto&detail=...&hold=8000&a=2&src=Claude%20Code
 *     emo    expressão (neutro, feliz, pensativa...)
 *     text   frase principal do painel; detail = linha menor abaixo
 *     hold   ms até voltar sozinha para "neutro" (0 = fica)
 *     a      intensidade do movimento, 1 a 3
 */
public class CommandServer extends Thread {
    private final int port;
    private final SavaView view;
    private volatile boolean stopped;
    private ServerSocket socket;

    public CommandServer(int port, SavaView view) {
        super("sava-server");
        this.port = port;
        this.view = view;
        setDaemon(true);
    }

    @Override
    public void run() {
        while (!stopped) {
            try {
                socket = new ServerSocket(port, 8, InetAddress.getByName("127.0.0.1"));
                socket.setReuseAddress(true);
                while (!stopped) {
                    Socket client = socket.accept();
                    try {
                        handle(client);
                    } catch (Exception ignored) {
                    } finally {
                        try { client.close(); } catch (Exception ignored) { }
                    }
                }
            } catch (Exception e) {
                if (stopped) return;
                try { Thread.sleep(2000); } catch (InterruptedException ie) { return; }
            } finally {
                try { if (socket != null) socket.close(); } catch (Exception ignored) { }
            }
        }
    }

    public void shutdown() {
        stopped = true;
        try { if (socket != null) socket.close(); } catch (Exception ignored) { }
    }

    private void handle(Socket client) throws Exception {
        client.setSoTimeout(3000);
        BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream(), "UTF-8"));
        String line = in.readLine();
        if (line == null) return;
        // Cabeçalhos: só para esvaziar a entrada.
        String h;
        while ((h = in.readLine()) != null && h.length() > 0) { }

        String[] parts = line.split(" ");
        String target = parts.length > 1 ? parts[1] : "/";
        String path = target;
        Map<String, String> q = new HashMap<String, String>();
        int qi = target.indexOf('?');
        if (qi >= 0) {
            path = target.substring(0, qi);
            for (String kv : target.substring(qi + 1).split("&")) {
                if (kv.length() == 0) continue;
                int e = kv.indexOf('=');
                String k = e >= 0 ? kv.substring(0, e) : kv;
                String v = e >= 0 ? kv.substring(e + 1) : "";
                q.put(decode(k), decode(v));
            }
        }

        String body;
        int status = 200;
        if ("/ping".equals(path)) {
            body = "sava ok";
        } else if ("/state".equals(path)) {
            final String emo = q.get("emo");
            final String text = q.get("text");
            final String detail = q.get("detail");
            final String src = q.get("src");
            final long hold = parseLong(q.get("hold"), 0);
            final int a = (int) parseLong(q.get("a"), 0);
            view.post(new Runnable() {
                public void run() {
                    view.applyState(emo, text, detail, src, hold, a);
                }
            });
            body = "ok";
        } else if ("/stats".equals(path)) {
            // Uso do PC, mandado pelo agente a cada ~5 s:
            // /stats?cpu=34&ram=61&ramUsed=9.8&ramTotal=16&gpu=30&gpuTemp=45&vramUsed=1.2&vramTotal=4
            //        &disk=79&diskFree=47&diskBusy=3&down=12000&up=800   (campos ausentes = sem dado)
            final Map<String, String> stats = q;
            view.post(new Runnable() {
                public void run() {
                    view.applyStats(stats);
                }
            });
            body = "ok";
        } else {
            status = 404;
            body = "not found";
        }
        respond(client.getOutputStream(), status, body);
    }

    /** %XX e "+" -> texto UTF-8. O URLDecoder do Android 4.0 estraga acentos, por isso é feito à mão. */
    private static String decode(String s) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream(s.length());
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '+') {
                out.write(' ');
            } else if (ch == '%' && i + 2 < s.length()) {
                int hi = Character.digit(s.charAt(i + 1), 16), lo = Character.digit(s.charAt(i + 2), 16);
                if (hi >= 0 && lo >= 0) {
                    out.write(hi * 16 + lo);
                    i += 2;
                } else {
                    out.write('%');
                }
            } else {
                byte[] b = String.valueOf(ch).getBytes("UTF-8");
                out.write(b, 0, b.length);
            }
        }
        byte[] bytes = out.toByteArray();
        try {
            // UTF-8 válido? (o normal)
            return Charset.forName("UTF-8").newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException e) {
            // Programas no Windows às vezes mandam na página de código do sistema (Latin-1).
            return new String(bytes, "windows-1252");
        }
    }

    private static long parseLong(String s, long def) {
        if (s == null) return def;
        try { return Long.parseLong(s.trim()); } catch (NumberFormatException e) { return def; }
    }

    private static void respond(OutputStream out, int status, String body) throws Exception {
        byte[] b = body.getBytes("UTF-8");
        String head = "HTTP/1.0 " + status + (status == 200 ? " OK" : " Not Found") + "\r\n"
                + "Content-Type: text/plain; charset=utf-8\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Content-Length: " + b.length + "\r\n"
                + "Connection: close\r\n\r\n";
        out.write(head.getBytes("UTF-8"));
        out.write(b);
        out.flush();
    }
}
