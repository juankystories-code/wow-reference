// Servidor local del portal. Compilar con web/server/compilar.bat.
// Al abrirlo: regenera web/portal.html (si hay Node), busca un puerto libre,
// sirve el portal en http://localhost:<puerto>/ y abre el navegador.
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;

class DiarioDelCazador
{
    const string Head =
        "<!doctype html>\n<html lang=\"es\">\n<head>\n" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n" +
        "<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n" +
        "</head>\n<body>\n";

    static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.Title = "Diario del Cazador";

        string root = FindRoot(AppDomain.CurrentDomain.BaseDirectory);
        if (root == null)
        {
            Console.WriteLine("No encuentro la carpeta web/ del repositorio. Deja el .exe en la raiz del repo.");
            Console.ReadKey();
            return 1;
        }
        string page = Path.Combine(root, "web", "portal.html");

        Rebuild(root);
        if (!File.Exists(page))
        {
            Console.WriteLine("No existe web/portal.html. Ejecuta: node web/build.mjs");
            Console.ReadKey();
            return 1;
        }

        // Puerto libre al azar; opcionalmente uno fijo: "Diario del Cazador.exe" 8080
        int port;
        if (args.Length == 0 || !int.TryParse(args[0], out port)) port = FreePort();
        string url = "http://localhost:" + port + "/";
        HttpListener http = new HttpListener();
        http.Prefixes.Add(url);
        try { http.Start(); }
        catch (Exception e)
        {
            Console.WriteLine("No se pudo abrir el servidor: " + e.Message);
            Console.ReadKey();
            return 1;
        }

        Console.WriteLine();
        Console.WriteLine("  Diario del Cazador en " + url);
        Console.WriteLine("  Cierra esta ventana para apagarlo.");
        Console.WriteLine();
        try { Process.Start(url); } catch { }

        while (true)
        {
            HttpListenerContext ctx;
            try { ctx = http.GetContext(); } catch { break; }
            try { Serve(ctx, page); } catch { }
        }
        return 0;
    }

    static void Serve(HttpListenerContext ctx, string page)
    {
        string path = ctx.Request.Url.AbsolutePath;
        HttpListenerResponse res = ctx.Response;
        byte[] body;
        if (path == "/" || path == "/index.html")
        {
            // Se lee en cada peticion: si regeneras el portal, basta con recargar.
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

    static void Rebuild(string root)
    {
        if (!File.Exists(Path.Combine(root, "web", "build.mjs"))) return;
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo("node", "web/build.mjs");
            psi.WorkingDirectory = root;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            Process p = Process.Start(psi);
            string outp = p.StandardOutput.ReadToEnd();
            string err = p.StandardError.ReadToEnd();
            p.WaitForExit(30000);
            Console.WriteLine(p.ExitCode == 0 ? "  " + outp.Trim() : "  No se pudo regenerar el portal:\n" + err);
        }
        catch
        {
            Console.WriteLine("  Node no esta instalado: uso el portal.html que ya hay.");
        }
    }

    static int FreePort()
    {
        TcpListener l = new TcpListener(IPAddress.Loopback, 0);
        l.Start();
        int port = ((IPEndPoint)l.LocalEndpoint).Port;
        l.Stop();
        return port;
    }
}
