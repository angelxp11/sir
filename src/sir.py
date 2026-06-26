import tkinter as tk
from tkinter import filedialog, messagebox
import json
import threading
import time

# Instalar:
# pip install mouse keyboard pyperclip

import mouse
import keyboard
import pyperclip


class InventarioAutoRelleno:

    def __init__(self, root):

        self.root = root
        self.root.title("Rellenar Inventario")

        # Siempre visible
        self.root.attributes("-topmost", True)

        # Redimensionable
        self.root.resizable(True, True)

        self.root.geometry("700x450")
        self.root.minsize(500, 300)

        self.items = []
        self.indice = 0

        self.estado = "bodega"
        self.activo = False
        self.bloqueo_click = False
        self.listener_id = None

        self.crear_interfaz()

    def crear_interfaz(self):

        frame_top = tk.Frame(self.root)
        frame_top.pack(fill="x", padx=10, pady=10)

        tk.Button(
            frame_top,
            text="Cargar JSON",
            font=("Arial", 12, "bold"),
            command=self.cargar_json
        ).pack(side="left")

        tk.Button(
            frame_top,
            text="Pegar JSON",
            font=("Arial", 12, "bold"),
            command=self.pegar_json
        ).pack(side="left", padx=5)

        self.btn_comenzar = tk.Button(
            frame_top,
            text="COMENZAR",
            bg="#16a34a",
            fg="white",
            font=("Arial", 14, "bold"),
            command=self.comenzar
        )
        self.btn_comenzar.pack(side="left", padx=10)

        self.btn_detener = tk.Button(
            frame_top,
            text="DETENER",
            bg="#dc2626",
            fg="white",
            font=("Arial", 14, "bold"),
            command=self.detener,
            state="disabled"
        )
        self.btn_detener.pack(side="left", padx=5)

        self.lbl_progreso = tk.Label(
            frame_top,
            text="0 / 0",
            font=("Arial", 12, "bold")
        )
        self.lbl_progreso.pack(side="right")

        self.lbl_nombre = tk.Label(
            self.root,
            text="Cargue un JSON",
            font=("Arial", 24, "bold"),
            wraplength=650,
            justify="left"
        )
        self.lbl_nombre.pack(fill="x", padx=15, pady=(20, 10))

        self.lbl_bodega = tk.Label(
            self.root,
            text="Bodega:",
            font=("Arial", 20, "bold"),
            anchor="w"
        )
        self.lbl_bodega.pack(fill="x", padx=20, pady=10)

        self.lbl_linea = tk.Label(
            self.root,
            text="Línea:",
            font=("Arial", 20, "bold"),
            anchor="w"
        )
        self.lbl_linea.pack(fill="x", padx=20, pady=10)

        self.lbl_estado = tk.Label(
            self.root,
            text="Esperando...",
            font=("Arial", 16, "bold"),
            fg="blue"
        )
        self.lbl_estado.pack(pady=20)

        # Bindings para navegación con flechas
        self.root.bind("<Up>", self.navegar_arriba)
        self.root.bind("<Down>", self.navegar_abajo)

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

            self.items = []

            for categoria in datos["categorias"]:

                for item in categoria["items"]:

                    self.items.append({
                        "categoria": categoria["nombre"],
                        "nombre": item["nombre"],
                        "bodega": str(item["bodega"]),
                        "linea": str(item["linea"])
                    })

            self.indice = 0

            self.mostrar_item()

            messagebox.showinfo(
                "Correcto",
                f"Se cargaron {len(self.items)} productos."
            )

        except Exception as e:

            messagebox.showerror(
                "Error",
                str(e)
            )

    def pegar_json(self):

        try:

            datos = json.loads(pyperclip.paste())

            self.items = []

            for categoria in datos["categorias"]:

                for item in categoria["items"]:

                    self.items.append({
                        "categoria": categoria["nombre"],
                        "nombre": item["nombre"],
                        "bodega": str(item["bodega"]),
                        "linea": str(item["linea"])
                    })

            self.indice = 0

            self.mostrar_item()

            messagebox.showinfo(
                "Correcto",
                f"Se cargaron {len(self.items)} productos."
            )

        except Exception as e:

            messagebox.showerror(
                "Error",
                f"JSON inválido en el portapapeles:\n{str(e)}"
            )

    def mostrar_item(self):

        if not self.items:
            return

        item = self.items[self.indice]

        self.lbl_nombre.config(
            text=item["nombre"]
        )

        self.lbl_bodega.config(
            text=f"📦 Bodega: {item['bodega']}",
            fg="black"
        )

        self.lbl_linea.config(
            text=f"📄 Línea: {item['linea']}",
            fg="black"
        )

        self.lbl_progreso.config(
            text=f"{self.indice + 1} / {len(self.items)}"
        )

        self.estado = "bodega"

        self.lbl_estado.config(
            text="Próximo clic: BODEGA",
            fg="blue"
        )

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

        self.btn_comenzar.config(state="disabled")
        self.btn_detener.config(state="normal")

        self.lbl_estado.config(
            text="Sistema activo",
            fg="green"
        )

        # Desregistrar listener anterior si existe
        if self.listener_id is not None:
            mouse.unhook(self.listener_id)

        self.listener_id = mouse.on_click(self.click_global)

        # Crear messagebox que se cierre automáticamente en 3 segundos
        ventana_info = tk.Toplevel(self.root)
        ventana_info.title("Iniciado")
        ventana_info.geometry("400x150")
        ventana_info.resizable(False, False)

        tk.Label(
            ventana_info,
            text="Ahora cada clic pegará Bodega y luego Línea.",
            font=("Arial", 12),
            wraplength=380,
            justify="center"
        ).pack(pady=20)

        def cerrar_ventana():
            try:
                ventana_info.destroy()
            except:
                pass

        ventana_info.after(3000, cerrar_ventana)

    def detener(self):

        if not self.activo:
            return

        self.activo = False

        # Desregistrar listener de mouse
        if self.listener_id is not None:
            mouse.unhook(self.listener_id)
            self.listener_id = None

        self.btn_comenzar.config(state="normal")
        self.btn_detener.config(state="disabled")

        self.lbl_estado.config(
            text="Sistema detenido - Usa flechas para navegar",
            fg="red"
        )

        messagebox.showinfo(
            "Detenido",
            f"Sistema detenido en producto {self.indice + 1} de {len(self.items)}.\nUsa las flechas arriba/abajo para navegar."
        )

    def click_global(self, event=None):

        if not self.activo:
            return

        if self.bloqueo_click:
            return

        if self.indice >= len(self.items):
            return

        self.bloqueo_click = True

        try:

            item = self.items[self.indice]

            # Espera pequeña para que el campo reciba el foco
            time.sleep(0.15)

            if self.estado == "bodega":

                pyperclip.copy(item["bodega"])
                keyboard.press_and_release("ctrl+v")

                self.root.after(
                    0,
                    lambda: self.lbl_bodega.config(fg="green")
                )

                self.root.after(
                    0,
                    lambda: self.lbl_estado.config(
                        text="Próximo clic: LÍNEA",
                        fg="orange"
                    )
                )

                self.estado = "linea"

            else:  # estado == "linea"

                pyperclip.copy(item["linea"])
                keyboard.press_and_release("ctrl+v")

                self.root.after(
                    0,
                    lambda: self.lbl_linea.config(fg="green")
                )

                self.indice += 1

                if self.indice >= len(self.items):

                    self.activo = False

                    self.root.after(
                        0,
                        lambda: self.btn_comenzar.config(state="normal")
                    )

                    self.root.after(
                        0,
                        lambda: self.btn_detener.config(state="disabled")
                    )

                    self.root.after(
                        0,
                        lambda: self.lbl_estado.config(
                            text="INVENTARIO COMPLETADO",
                            fg="green"
                        )
                    )

                    self.root.after(
                        0,
                        lambda: messagebox.showinfo(
                            "Finalizado",
                            "Se completaron todos los productos."
                        )
                    )

                    if self.listener_id is not None:
                        mouse.unhook(self.listener_id)
                        self.listener_id = None

                    return

                # Mostrar siguiente item después de una pausa
                self.root.after(
                    300,
                    self.mostrar_item
                )

        except Exception as e:
            print(f"Error en click_global: {e}")

        finally:
            time.sleep(0.2)
            self.bloqueo_click = False


if __name__ == "__main__":

    root = tk.Tk()

    app = InventarioAutoRelleno(root)

    root.mainloop()