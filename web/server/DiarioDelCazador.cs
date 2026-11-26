// Servidor local del portal. Compilar con web/server/compilar.bat.
// Al abrirlo: regenera web/portal.html (si hay Node), sirve el portal en
// http://localhost:4060/ y abre el navegador. No tiene ventana: vive como un
// icono junto al reloj (clic derecho → Salir). Los errores salen en un aviso.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Windows.Forms;

class DiarioDelCazador
{
    // Siempre el mismo puerto: las casillas marcadas se guardan por puerto en el navegador.
    // Se puede cambiar con un argumento: "Diario del Cazador.exe" 8080
    const int DefaultPort = 4060;
    const string Title = "Diario del Cazador";
    const string Head =
        "<!doctype html>\n<html lang=\"es\">\n<head>\n" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n" +
        "<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n" +
        "</head>\n<body>\n";

    static string root, page, url;
    static NotifyIcon tray;

    [STAThread]
    static int Main(string[] args)
    {
        try { return Run(args); }
        catch (Exception e)
        {
            Fail("Ha fallado algo inesperado:\n\n" + e);
            return 1;
        }
    }

    static int Run(string[] args)
    {
        Application.EnableVisualStyles();

        int port;
        if (args.Length == 0 || !int.TryParse(args[0], out port)) port = DefaultPort;
        url = "http://localhost:" + port + "/";

        // Si ya hay uno abierto, solo abre el navegador.
        if (IsRunning(url)) { OpenBrowser(); return 0; }

        root = FindRoot(AppDomain.CurrentDomain.BaseDirectory);
        if (root == null)
        {
            Fail("No encuentro la carpeta web/ del repositorio.\nDeja el .exe en la raíz del repositorio wow-reference.");
            return 1;
        }
        page = Path.Combine(root, "web", "portal.html");

        string buildMsg = Rebuild();
        if (!File.Exists(page))
        {
            Fail("No existe web/portal.html y no se pudo generar.\n\n" + buildMsg);
            return 1;
        }

        HttpListener http = new HttpListener();
        http.Prefixes.Add(url);
        try { http.Start(); }
        catch (Exception e)
        {
            Fail("No se pudo abrir el servidor en el puerto " + port + ":\n" + e.Message +
                 "\n\nPrueba otro puerto: \"Diario del Cazador.exe\" 8080");
            return 1;
        }

        Thread server = new Thread(delegate ()
        {
            while (http.IsListening)
            {
                HttpListenerContext ctx;
                try { ctx = http.GetContext(); } catch { break; }
                try { Serve(ctx); } catch { }
            }
        });
        server.IsBackground = true;
        server.Start();

        ContextMenuStrip menu = new ContextMenuStrip();
        menu.Items.Add("Abrir el portal", null, delegate { OpenBrowser(); });
        menu.Items.Add("Regenerar desde las guías", null, delegate
        {
            string m = Rebuild();
            tray.ShowBalloonTip(3000, Title, m + "\nRecarga la página.", ToolTipIcon.Info);
        });
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Salir", null, delegate { tray.Visible = false; http.Stop(); Application.Exit(); });

        tray = new NotifyIcon();
        tray.Icon = AppIcon();
        tray.Text = Title + " · localhost:" + port;
        tray.ContextMenuStrip = menu;
        tray.DoubleClick += delegate { OpenBrowser(); };
        tray.Visible = true;
        tray.ShowBalloonTip(4000, Title, "Funcionando en " + url +
            "\nDoble clic en este icono para abrirlo; clic derecho → Salir para apagarlo.", ToolTipIcon.Info);

        OpenBrowser();
        Application.Run();
        tray.Visible = false;
        return 0;
    }

    static void Serve(HttpListenerContext ctx)
    {
        string path = ctx.Request.Url.AbsolutePath;
        HttpListenerResponse res = ctx.Response;
        byte[] body;
        if (path == "/" || path == "/index.html")
        {
            // Se lee en cada petición: si regeneras el portal, basta con recargar.
            body = Encoding.UTF8.GetBytes(Head + File.ReadAllText(page, Encoding.UTF8) + "\n</body>\n</html>\n");
            res.ContentType = "text/html; charset=utf-8";
            res.AddHeader("Cache-Control", "no-store");
        }
        else
        {
            res.StatusCode = 404;
            body = new byte[0];
        }
        res.ContentLength64 = body.Length;
        res.OutputStream.Write(body, 0, body.Length);
        res.OutputStream.Close();
    }

    static string Rebuild()
    {
        if (!File.Exists(Path.Combine(root, "web", "build.mjs"))) return "No está web/build.mjs.";
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo("node", "web/build.mjs");
            psi.WorkingDirectory = root;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            Process p = Process.Start(psi);
            string err = p.StandardError.ReadToEndAsync().Result;
            string outp = p.StandardOutput.ReadToEnd();
            p.WaitForExit(30000);
            return p.ExitCode == 0 ? outp.Trim() : "No se pudo regenerar el portal:\n" + err.Trim();
        }
        catch
        {
            return "Node no está instalado: uso el portal.html que ya hay.";
        }
    }

    static void OpenBrowser()
    {
        try { Process.Start(url); } catch (Exception e) { Fail("No se pudo abrir el navegador:\n" + e.Message + "\n\nAbre a mano " + url); }
    }

    static bool IsRunning(string u)
    {
        try
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(u);
            req.Timeout = 1500;
            req.Proxy = null;
            using (HttpWebResponse r = (HttpWebResponse)req.GetResponse())
                return r.StatusCode == HttpStatusCode.OK;
        }
        catch { return false; }
    }

    static string FindRoot(string dir)
    {
        DirectoryInfo d = new DirectoryInfo(dir);
        while (d != null)
        {
            if (File.Exists(Path.Combine(d.FullName, "web", "build.mjs")) ||
                File.Exists(Path.Combine(d.FullName, "web", "portal.html")))
                return d.FullName;
            d = d.Parent;
        }
        return null;
    }

    static Icon AppIcon()
    {
        try { return Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
        catch { return SystemIcons.Application; }
    }

    static void Fail(string msg)
    {
        try { File.WriteAllText(Path.Combine(root ?? AppDomain.CurrentDomain.BaseDirectory, "diario.log"), DateTime.Now + "\n" + msg); } catch { }
        MessageBox.Show(msg, Title, MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }
}
