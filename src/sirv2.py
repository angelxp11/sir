import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import json
import time

# Instalar:
# pip install keyboard pyperclip

import keyboard
import pyperclip


# ------------------------- PALETA DE COLORES -------------------------
BG_APP = "#eef1f6"
BG_CARD = "#ffffff"
BG_HEADER = "#111827"
TXT_HEADER = "#f9fafb"
TXT_SUBHEADER = "#9ca3af"

COLOR_PRIMARY = "#2563eb"
COLOR_PRIMARY_DARK = "#1d4ed8"
COLOR_GREEN = "#16a34a"
COLOR_GREEN_DARK = "#15803d"
COLOR_RED = "#dc2626"
COLOR_RED_DARK = "#b91c1c"
COLOR_ORANGE = "#d97706"
COLOR_GRAY_TXT = "#6b7280"
COLOR_DARK_TXT = "#111827"

CHIP_IDLE_BG = "#f3f4f6"
CHIP_IDLE_FG = "#374151"
CHIP_DONE_BG = "#dcfce7"
CHIP_DONE_FG = "#15803d"

FONT_FAMILY = "Segoe UI"


class InventarioAutoRelleno:

    def __init__(self, root):

        self.root = root
        self.root.title("Rellenar Inventario")
        self.root.attributes("-topmost", True)

        ANCHO_FIJO = 400
        ALTO_INICIAL = 620
        ALTO_MINIMO = 480

        self.root.geometry(f"{ANCHO_FIJO}x{ALTO_INICIAL}")
        # El ancho queda fijo (mínimo = máximo); solo el alto se puede ajustar.
        self.root.minsize(ANCHO_FIJO, ALTO_MINIMO)
        self.root.maxsize(ANCHO_FIJO, 3000)
        self.root.resizable(False, True)
        self.root.configure(bg=BG_APP)

        self.items = []
        self.indice = 0

        self.estado = "bodega"
        self.activo = False
        self.bloqueo_click = False
        self.listener_id = None
        self.listener_enter_id = None
        self.modo_exportacion = "ambos"
        self.requiere_enter_primero = True
        self.ventana_info = None

        # Tiempo (ms) que se muestra el chip en verde antes de pasar al
        # siguiente producto, para que el usuario vea la confirmación.
        self.RETARDO_TRANSICION_MS = 450

        self.configurar_estilos()
        self.crear_interfaz()

    # ------------------------- ESTILOS -------------------------
    def configurar_estilos(self):
        style = ttk.Style(self.root)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure(
            "TProgressbar",
            troughcolor="#e5e7eb",
            bordercolor="#e5e7eb",
            background=COLOR_PRIMARY,
            lightcolor=COLOR_PRIMARY,
            darkcolor=COLOR_PRIMARY,
            thickness=10,
        )

    def boton_flat(self, parent, text, bg, fg, hover_bg, command, font_size=11, padx=16, pady=8, state="normal"):
        btn = tk.Button(
            parent,
            text=text,
            bg=bg,
            fg=fg,
            activebackground=hover_bg,
            activeforeground=fg,
            font=(FONT_FAMILY, font_size, "bold"),
            relief="flat",
            bd=0,
            padx=padx,
            pady=pady,
            cursor="hand2",
            command=command,
            state=state,
            disabledforeground="#d1d5db",
        )

        def on_enter(e):
            if btn["state"] != "disabled":
                btn.config(bg=hover_bg)

        def on_leave(e):
            if btn["state"] != "disabled":
                btn.config(bg=bg)

        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)
        return btn

    # ------------------------- INTERFAZ -------------------------
    def crear_interfaz(self):

        # ---------- HEADER ----------
        header = tk.Frame(self.root, bg=BG_HEADER)
        header.pack(fill="x")

        header_inner = tk.Frame(header, bg=BG_HEADER)
        header_inner.pack(fill="x", padx=24, pady=16)

        tk.Label(
            header_inner,
            text="📦 Auto Rellenar Inventario",
            font=(FONT_FAMILY, 18, "bold"),
            bg=BG_HEADER,
            fg=TXT_HEADER,
        ).pack(anchor="w")

        tk.Label(
            header_inner,
            text="Carga un JSON y deja que el sistema escriba los valores por ti",
            font=(FONT_FAMILY, 10),
            bg=BG_HEADER,
            fg=TXT_SUBHEADER,
        ).pack(anchor="w", pady=(2, 0))

        # ---------- TOOLBAR ----------
        toolbar = tk.Frame(self.root, bg=BG_APP)
        toolbar.pack(fill="x", padx=24, pady=(18, 10))

        toolbar.columnconfigure(0, weight=1, uniform="toolbar")
        toolbar.columnconfigure(1, weight=1, uniform="toolbar")

        btn_cargar = self.boton_flat(
            toolbar, "📂  Cargar JSON", "#e5e7eb", COLOR_DARK_TXT, "#d1d5db",
            self.cargar_json, font_size=11
        )
        btn_cargar.grid(row=0, column=0, sticky="ew", padx=(0, 4), pady=(0, 6))

        btn_pegar = self.boton_flat(
            toolbar, "📋  Pegar JSON", "#e5e7eb", COLOR_DARK_TXT, "#d1d5db",
            self.pegar_json, font_size=11
        )
        btn_pegar.grid(row=0, column=1, sticky="ew", padx=(4, 0), pady=(0, 6))

        self.btn_comenzar = self.boton_flat(
            toolbar, "▶  COMENZAR", COLOR_GREEN, "white", COLOR_GREEN_DARK,
            self.comenzar, font_size=12
        )
        self.btn_comenzar.grid(row=1, column=0, sticky="ew", padx=(0, 4))

        self.btn_detener = self.boton_flat(
            toolbar, "⏹  DETENER", COLOR_RED, "white", COLOR_RED_DARK,
            self.detener, font_size=12, state="disabled"
        )
        self.btn_detener.grid(row=1, column=1, sticky="ew", padx=(4, 0))

        # ---------- PROGRESO ----------
        progreso_frame = tk.Frame(self.root, bg=BG_APP)
        progreso_frame.pack(fill="x", padx=24, pady=(4, 4))

        fila_progreso = tk.Frame(progreso_frame, bg=BG_APP)
        fila_progreso.pack(fill="x")

        tk.Label(
            fila_progreso, text="Progreso", font=(FONT_FAMILY, 9, "bold"),
            bg=BG_APP, fg=COLOR_GRAY_TXT
        ).pack(side="left")

        self.lbl_progreso = tk.Label(
            fila_progreso, text="0 / 0", font=(FONT_FAMILY, 9, "bold"),
            bg=BG_APP, fg=COLOR_GRAY_TXT
        )
        self.lbl_progreso.pack(side="right")

        self.barra_progreso = ttk.Progressbar(
            progreso_frame, style="TProgressbar", orient="horizontal", mode="determinate"
        )
        self.barra_progreso.pack(fill="x", pady=(4, 0))

        # ---------- BARRA DE ESTADO ----------
        # Se empaqueta ANTES que la tarjeta para que su espacio quede
        # reservado siempre abajo, sin importar qué tan largo sea el
        # nombre del producto ni cuánto crezca la tarjeta.
        self.estado_frame = tk.Frame(self.root, bg="#dbeafe")
        self.estado_frame.pack(fill="x", side="bottom")

        self.lbl_estado = tk.Label(
            self.estado_frame,
            text="Esperando un JSON...",
            font=(FONT_FAMILY, 11, "bold"),
            bg="#dbeafe",
            fg=COLOR_PRIMARY_DARK,
            anchor="w",
            justify="left",
            wraplength=700,
            pady=10,
        )
        self.lbl_estado.pack(fill="x", padx=24)

        # ---------- TARJETA PRINCIPAL ----------
        card_outer = tk.Frame(self.root, bg=BG_APP)
        card_outer.pack(fill="both", expand=True, padx=24, pady=16)

        card = tk.Frame(
            card_outer, bg=BG_CARD, highlightbackground="#e5e7eb",
            highlightthickness=1, bd=0
        )
        card.pack(fill="both", expand=True)

        contenido = tk.Frame(card, bg=BG_CARD)
        contenido.pack(fill="both", expand=True, padx=28, pady=26)

        self.lbl_categoria = tk.Label(
            contenido,
            text="—",
            font=(FONT_FAMILY, 10, "bold"),
            bg=BG_CARD,
            fg=COLOR_PRIMARY,
            anchor="w",
        )
        self.lbl_categoria.pack(fill="x")

        self.lbl_nombre = tk.Label(
            contenido,
            text="Cargue un JSON para comenzar",
            font=(FONT_FAMILY, 22, "bold"),
            bg=BG_CARD,
            fg=COLOR_DARK_TXT,
            wraplength=650,
            justify="left",
            anchor="w",
        )
        self.lbl_nombre.pack(fill="x", pady=(4, 20))

        # Ajusta el salto de línea del nombre al ancho real de la tarjeta,
        # para que los nombres largos siempre se vean completos.
        contenido.bind(
            "<Configure>",
            lambda e: self.lbl_nombre.config(wraplength=max(e.width - 4, 100))
        )

        # Chips de Bodega / Línea
        chips_frame = tk.Frame(contenido, bg=BG_CARD)
        chips_frame.pack(fill="x", pady=(0, 10))

        self.chip_bodega = tk.Frame(chips_frame, bg=CHIP_IDLE_BG)
        self.chip_bodega.pack(side="left", fill="both", expand=True, padx=(0, 8), ipady=10)

        tk.Label(
            self.chip_bodega, text="BODEGA", font=(FONT_FAMILY, 9, "bold"),
            bg=CHIP_IDLE_BG, fg=COLOR_GRAY_TXT
        ).pack(anchor="w", padx=14, pady=(6, 0))

        self.lbl_bodega = tk.Label(
            self.chip_bodega, text="—", font=(FONT_FAMILY, 20, "bold"),
            bg=CHIP_IDLE_BG, fg=CHIP_IDLE_FG
        )
        self.lbl_bodega.pack(anchor="w", padx=14, pady=(0, 6))

        self.chip_linea = tk.Frame(chips_frame, bg=CHIP_IDLE_BG)
        self.chip_linea.pack(side="left", fill="both", expand=True, padx=(8, 0), ipady=10)

        tk.Label(
            self.chip_linea, text="LÍNEA", font=(FONT_FAMILY, 9, "bold"),
            bg=CHIP_IDLE_BG, fg=COLOR_GRAY_TXT
        ).pack(anchor="w", padx=14, pady=(6, 0))

        self.lbl_linea = tk.Label(
            self.chip_linea, text="—", font=(FONT_FAMILY, 20, "bold"),
            bg=CHIP_IDLE_BG, fg=CHIP_IDLE_FG
        )
        self.lbl_linea.pack(anchor="w", padx=14, pady=(0, 6))

        # Navegación manual
        nav_frame = tk.Frame(contenido, bg=BG_CARD)
        nav_frame.pack(fill="x", pady=(18, 0))

        tk.Label(
            nav_frame, text="Navegación manual (con el sistema detenido):",
            font=(FONT_FAMILY, 9), bg=BG_CARD, fg=COLOR_GRAY_TXT
        ).pack(side="left")

        self.boton_flat(
            nav_frame, "↑", "#f3f4f6", COLOR_DARK_TXT, "#e5e7eb",
            self.navegar_arriba, font_size=10, padx=10, pady=4
        ).pack(side="right", padx=(6, 0))

        self.boton_flat(
            nav_frame, "↓", "#f3f4f6", COLOR_DARK_TXT, "#e5e7eb",
            self.navegar_abajo, font_size=10, padx=10, pady=4
        ).pack(side="right")

        # Bindings para navegación con flechas
        self.root.bind("<Up>", self.navegar_arriba)
        self.root.bind("<Down>", self.navegar_abajo)

    # ------------------------- LÓGICA (sin cambios funcionales) -------------------------
    def set_estado_frame(self, color_bg, color_fg):
        self.estado_frame.config(bg=color_bg)
        self.lbl_estado.config(bg=color_bg, fg=color_fg)

    def detectar_modo_exportacion(self, datos):

        if isinstance(datos, dict):
            modo = datos.get("modoExportacion") or datos.get("modo") or datos.get("exportMode")
            if isinstance(modo, str):
                modo_normalizado = modo.strip().lower()
                if modo_normalizado in {"bodega", "linea", "ambos"}:
                    return modo_normalizado

        tiene_bodega = False
        tiene_linea = False

        for categoria in datos.get("categorias", []):
            for item in categoria.get("items", []):
                if isinstance(item, dict):
                    if "bodega" in item:
                        tiene_bodega = True
                    if "linea" in item:
                        tiene_linea = True

                if tiene_bodega and tiene_linea:
                    break

            if tiene_bodega and tiene_linea:
                break

        if tiene_bodega and tiene_linea:
            return "ambos"
        if tiene_bodega:
            return "bodega"
        if tiene_linea:
            return "linea"

        return "ambos"

    def cargar_items_desde_datos(self, datos):

        self.items = []

        for categoria in datos.get("categorias", []):
            for item in categoria.get("items", []):
                self.items.append({
                    "categoria": categoria.get("nombre", ""),
                    "nombre": item.get("nombre", ""),
                    "bodega": str(item.get("bodega", "")),
                    "linea": str(item.get("linea", ""))
                })

    def cargar_json(self):

        ruta = filedialog.askopenfilename(
            title="Seleccionar JSON",
            filetypes=[("JSON", "*.json")]
        )

        if not ruta:
            return

        try:

            with open(ruta, "r", encoding="utf-8") as archivo:
                datos = json.load(archivo)

            self.modo_exportacion = self.detectar_modo_exportacion(datos)
            self.cargar_items_desde_datos(datos)
            self.indice = 0

            self.mostrar_item()

            messagebox.showinfo(
                "Correcto",
                f"Se cargaron {len(self.items)} productos.\nModo detectado: {self.modo_exportacion.upper()}"
            )

        except Exception as e:

            messagebox.showerror(
                "Error",
                str(e)
            )

    def pegar_json(self):

        try:

            datos = json.loads(pyperclip.paste())
            self.modo_exportacion = self.detectar_modo_exportacion(datos)
            self.cargar_items_desde_datos(datos)
            self.indice = 0

            self.mostrar_item()

            messagebox.showinfo(
                "Correcto",
                f"Se cargaron {len(self.items)} productos.\nModo detectado: {self.modo_exportacion.upper()}"
            )

        except Exception as e:

            messagebox.showerror(
                "Error",
                f"JSON inválido en el portapapeles:\n{str(e)}"
            )

    def escribir_valor(self, valor):

        try:
            time.sleep(0.05)
            keyboard.write(str(valor))
        except Exception as e:
            print(f"Error al escribir valor: {e}")

    def mostrar_item(self):

        if not self.items or self.indice < 0 or self.indice >= len(self.items):
            self.lbl_categoria.config(text="—")
            self.lbl_nombre.config(text="Cargue un JSON para comenzar")
            self.lbl_bodega.config(text="—", bg=CHIP_IDLE_BG, fg=CHIP_IDLE_FG)
            self.chip_bodega.config(bg=CHIP_IDLE_BG)
            for w in self.chip_bodega.winfo_children():
                if w is not self.lbl_bodega:
                    w.config(bg=CHIP_IDLE_BG)
            self.lbl_linea.config(text="—", bg=CHIP_IDLE_BG, fg=CHIP_IDLE_FG)
            self.chip_linea.config(bg=CHIP_IDLE_BG)
            for w in self.chip_linea.winfo_children():
                if w is not self.lbl_linea:
                    w.config(bg=CHIP_IDLE_BG)
            self.lbl_progreso.config(text="0 / 0")
            self.barra_progreso["maximum"] = 0
            self.barra_progreso["value"] = 0
            self.lbl_estado.config(text="Esperando un JSON...")
            self.set_estado_frame("#dbeafe", COLOR_PRIMARY_DARK)
            return

        item = self.items[self.indice]

        self.lbl_categoria.config(text=item["categoria"] or "Sin categoría")
        self.lbl_nombre.config(text=item["nombre"])

        self.lbl_bodega.config(text=item["bodega"], bg=CHIP_IDLE_BG, fg=CHIP_IDLE_FG)
        self.chip_bodega.config(bg=CHIP_IDLE_BG)
        for w in self.chip_bodega.winfo_children():
            if w is not self.lbl_bodega:
                w.config(bg=CHIP_IDLE_BG)

        self.lbl_linea.config(text=item["linea"], bg=CHIP_IDLE_BG, fg=CHIP_IDLE_FG)
        self.chip_linea.config(bg=CHIP_IDLE_BG)
        for w in self.chip_linea.winfo_children():
            if w is not self.lbl_linea:
                w.config(bg=CHIP_IDLE_BG)

        self.lbl_progreso.config(text=f"{self.indice + 1} / {len(self.items)}")

        if self.items:
            self.barra_progreso["maximum"] = len(self.items)
            self.barra_progreso["value"] = self.indice

        self.estado = "bodega"

        if self.modo_exportacion == "bodega":
            texto_estado = "Modo detectado: BODEGA — presiona Tab o Enter para escribir"
        elif self.modo_exportacion == "linea":
            texto_estado = "Modo detectado: LÍNEA — presiona Tab o Enter para escribir"
        else:
            texto_estado = "Próxima tecla escribirá: BODEGA"

        self.lbl_estado.config(text=texto_estado)
        self.set_estado_frame("#dbeafe", COLOR_PRIMARY_DARK)

    def navegar_arriba(self, event=None):

        if self.activo:
            return

        if not self.items:
            return

        if self.indice > 0:

            self.indice -= 1

            self.mostrar_item()

    def navegar_abajo(self, event=None):

        if self.activo:
            return

        if not self.items:
            return

        if self.indice < len(self.items) - 1:

            self.indice += 1

            self.mostrar_item()

    def comenzar(self):

        if not self.items:

            messagebox.showwarning(
                "Advertencia",
                "Primero cargue un JSON."
            )
            return

        if self.activo:
            return

        self.activo = True

        self.btn_comenzar.config(state="disabled", bg="#a7f3d0")
        self.btn_detener.config(state="normal", bg=COLOR_RED)

        self.lbl_estado.config(text="Sistema activo — el primer elemento requiere Enter")
        self.set_estado_frame("#dcfce7", COLOR_GREEN_DARK)

        keyboard.unhook_all()
        self.listener_id = keyboard.on_press_key("tab", lambda event: self.procesar_accion(event, "tab"))
        self.listener_enter_id = keyboard.on_press_key("enter", lambda event: self.procesar_accion(event, "enter"))
        self.requiere_enter_primero = True

        self.cerrar_ventana_info()

        ventana_info = tk.Toplevel(self.root)
        ventana_info.title("Iniciado")
        ventana_info.geometry("420x120")
        ventana_info.resizable(False, False)
        ventana_info.attributes("-topmost", True)
        ventana_info.overrideredirect(True)
        ventana_info.configure(bg="#fef3c7")
        ventana_info.lift()

        ventana_info.update_idletasks()
        x = 12
        y = 12
        ventana_info.geometry(f"+{x}+{y}")

        contenido_info = tk.Frame(ventana_info, bg="#fef3c7")
        contenido_info.pack(fill="both", expand=True, padx=14, pady=12)

        tk.Label(
            contenido_info,
            text="✅ SISTEMA ACTIVO",
            font=(FONT_FAMILY, 12, "bold"),
            bg="#fef3c7",
            fg=COLOR_ORANGE,
            anchor="w",
            justify="left",
        ).pack(anchor="w")

        tk.Label(
            contenido_info,
            text="Enter o Tab escribirán el valor correspondiente.\nEl primer elemento comienza con Enter.",
            font=(FONT_FAMILY, 10),
            bg="#fef3c7",
            fg=COLOR_DARK_TXT,
            anchor="w",
            justify="left",
        ).pack(anchor="w", pady=(4, 0))

        self.ventana_info = ventana_info

    def detener(self):

        if not self.activo:
            return

        self.activo = False

        keyboard.unhook_all()
        self.listener_id = None
        self.listener_enter_id = None
        self.requiere_enter_primero = True

        self.cerrar_ventana_info()

        self.btn_comenzar.config(state="normal", bg=COLOR_GREEN)
        self.btn_detener.config(state="disabled", bg="#fca5a5")

        self.lbl_estado.config(text="Sistema detenido — usa ↑ / ↓ para navegar")
        self.set_estado_frame("#fee2e2", COLOR_RED_DARK)

        messagebox.showinfo(
            "Detenido",
            f"Sistema detenido en producto {self.indice + 1} de {len(self.items)}.\nUsa las flechas arriba/abajo para navegar."
        )

    def cerrar_ventana_info(self):
        if self.ventana_info is not None:
            try:
                self.ventana_info.destroy()
            except Exception:
                pass
            self.ventana_info = None

    def _marcar_chip_completo(self, chip, label):
        chip.config(bg=CHIP_DONE_BG)
        for w in chip.winfo_children():
            w.config(bg=CHIP_DONE_BG)
        label.config(fg=CHIP_DONE_FG)

    def _finalizar_inventario(self):

        self.activo = False

        self.cerrar_ventana_info()

        self.root.after(0, lambda: self.btn_comenzar.config(state="normal", bg=COLOR_GREEN))
        self.root.after(0, lambda: self.btn_detener.config(state="disabled", bg="#fca5a5"))
        self.root.after(0, lambda: self.lbl_estado.config(text="🎉 INVENTARIO COMPLETADO"))
        self.root.after(0, lambda: self.set_estado_frame("#dcfce7", COLOR_GREEN_DARK))
        self.root.after(0, lambda: self.barra_progreso.config(value=self.barra_progreso["maximum"]))

        self.root.after(
            0,
            lambda: messagebox.showinfo(
                "Finalizado",
                "Se completaron todos los productos."
            )
        )

        keyboard.unhook_all()
        self.listener_id = None
        self.listener_enter_id = None

    def procesar_accion(self, event=None, origen="tab"):

        if not self.activo:
            return

        if self.bloqueo_click:
            return

        if self.indice >= len(self.items):
            return

        if self.requiere_enter_primero and origen != "enter":
            self.root.after(
                0,
                lambda: self.lbl_estado.config(text="⚠ Primer elemento: usa Enter")
            )
            self.root.after(0, lambda: self.set_estado_frame("#fef3c7", COLOR_ORANGE))
            return

        self.bloqueo_click = True

        try:

            item = self.items[self.indice]

            if self.modo_exportacion == "bodega":

                self.escribir_valor(item["bodega"])

                self.root.after(0, lambda: self._marcar_chip_completo(self.chip_bodega, self.lbl_bodega))
                self.root.after(0, lambda: self.lbl_estado.config(text="✔ BODEGA escrita"))
                self.root.after(0, lambda: self.set_estado_frame("#dcfce7", COLOR_GREEN_DARK))

                self.indice += 1
                self.requiere_enter_primero = False

                if self.indice >= len(self.items):
                    self._finalizar_inventario()
                    return

                self.root.after(self.RETARDO_TRANSICION_MS, self.mostrar_item)

            elif self.modo_exportacion == "linea":

                self.escribir_valor(item["linea"])

                self.root.after(0, lambda: self._marcar_chip_completo(self.chip_linea, self.lbl_linea))
                self.root.after(0, lambda: self.lbl_estado.config(text="✔ LÍNEA escrita"))
                self.root.after(0, lambda: self.set_estado_frame("#dcfce7", COLOR_GREEN_DARK))

                self.indice += 1
                self.requiere_enter_primero = False

                if self.indice >= len(self.items):
                    self._finalizar_inventario()
                    return

                self.root.after(self.RETARDO_TRANSICION_MS, self.mostrar_item)

            else:  # modo_exportacion == "ambos"

                if self.estado == "bodega":

                    self.escribir_valor(item["bodega"])

                    self.root.after(0, lambda: self._marcar_chip_completo(self.chip_bodega, self.lbl_bodega))
                    self.root.after(0, lambda: self.lbl_estado.config(text="Próxima tecla escribirá: LÍNEA"))
                    self.root.after(0, lambda: self.set_estado_frame("#fef3c7", COLOR_ORANGE))

                    self.estado = "linea"
                    self.requiere_enter_primero = False

                else:  # estado == "linea"

                    self.escribir_valor(item["linea"])

                    self.root.after(0, lambda: self._marcar_chip_completo(self.chip_linea, self.lbl_linea))
                    self.root.after(0, lambda: self.lbl_estado.config(text="✔ LÍNEA escrita"))
                    self.root.after(0, lambda: self.set_estado_frame("#dcfce7", COLOR_GREEN_DARK))

                    self.indice += 1
                    self.requiere_enter_primero = False

                    if self.indice >= len(self.items):
                        self._finalizar_inventario()
                        return

                    self.root.after(self.RETARDO_TRANSICION_MS, self.mostrar_item)

        except Exception as e:
            print(f"Error en procesar_accion: {e}")

        finally:
            self.bloqueo_click = False


if __name__ == "__main__":

    root = tk.Tk()

    try:
        app = InventarioAutoRelleno(root)
        root.mainloop()
    except KeyboardInterrupt:
        print("Programa detenido por el usuario.")
        root.destroy()