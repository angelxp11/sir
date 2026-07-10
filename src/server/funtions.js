import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "./server";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  documentId,
} from "firebase/firestore";
import { arrayUnion, arrayRemove } from "firebase/firestore";

/**
 * Inicia sesión con correo y contraseña usando Firebase Authentication.
 * También establece persistencia local para mantener la sesión.
 * @param {string} correo
 * @param {string} password
 * @returns {Promise<void>}
 */
export async function iniciarSesionConCorreoYContrasena(correo, password) {
  if (!correo || !password) {
    throw new Error("Correo y contraseña son obligatorios");
  }

  await setPersistence(auth, browserLocalPersistence);
  const userCredential = await signInWithEmailAndPassword(auth, correo, password);
  return userCredential.user;
}

/**
 * Cierra la sesión del usuario actual.
 * @returns {Promise<void>}
 */
export async function cerrarSesion() {
  return signOut(auth);
}

/**
 * Obtiene la información del usuario por uid (asumiendo que el documento tiene id = uid).
 * @param {string} uid
 */
export async function obtenerInformacionUsuarioPorUid(uid) {
  if (!uid) return null;
  const docRef = doc(db, "usuarios", uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

/**
 * Obtiene la información del usuario por correo desde la colección `usuarios`.
 * @param {string} correo
 */
export async function obtenerInformacionUsuarioPorCorreo(correo) {
  if (!correo) return null;
  const q = query(collection(db, "usuarios"), where("correo", "==", correo));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
}

export async function obtenerInformacionUsuariosPorIds(uids) {
  if (!Array.isArray(uids) || uids.length === 0) return [];
  const chunkSize = 10;
  const results = [];
  for (let i = 0; i < uids.length; i += chunkSize) {
    const chunk = uids.slice(i, i + chunkSize);
    const q = query(collection(db, "usuarios"), where(documentId(), "in", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((docSnap) => results.push({ id: docSnap.id, ...docSnap.data() }));
  }
  return results;
}

export async function actualizarUsuario(uid, data) {
  if (!uid) throw new Error("UID requerido");
  await updateDoc(doc(db, "usuarios", uid), {
    ...data,
    updatedAt: new Date(),
  });
}
/**
 * Crear tienda (solo gerente)
 */
export async function crearTienda(nombre, managerUid = null) {
  if (!nombre) throw new Error("Nombre requerido");

  const data = {
    nombre,
    fechaCreacion: new Date(),
    activa: true,
  };

  if (managerUid) {
    data.manager = managerUid;
    data.personal = [managerUid];
  }

  const ref = await addDoc(collection(db, "tiendas"), data);

  // Si se proporcionó managerUid, asociar la tienda al usuario
  if (managerUid) {
    await updateDoc(doc(db, "usuarios", managerUid), {
      idTienda: ref.id,
    });
  }

  return ref.id;
}

/**
 * Obtener tienda por id
 */
export async function obtenerTiendaPorId(idTienda) {
  if (!idTienda) return null;

  const snap = await getDoc(doc(db, "tiendas", idTienda));

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }

  return null;
}

/**
 * Editar tienda
 */
export async function editarTienda(idTienda, data) {
  if (!idTienda) throw new Error("ID requerido");

  await updateDoc(doc(db, "tiendas", idTienda), {
    ...data,
    updatedAt: new Date(),
  });
}

/**
 * Agregar personal a una tienda (añade uid a campo `personal` y establece `idTienda` en usuario)
 */
export async function agregarPersonalATienda(idTienda, uidPersonal) {
  if (!idTienda || !uidPersonal) throw new Error("Parámetros requeridos");

  // Añadir uid al array `personal` de la tienda
  await updateDoc(doc(db, "tiendas", idTienda), {
    personal: arrayUnion(uidPersonal),
  });

  // Asociar tienda en el documento de usuario
  await updateDoc(doc(db, "usuarios", uidPersonal), {
    idTienda: idTienda,
  });
}

/**
 * Quitar personal de una tienda (remover uid de `personal` y limpiar `idTienda` en usuario)
 */
export async function quitarPersonalDeTienda(idTienda, uidPersonal) {
  if (!idTienda || !uidPersonal) throw new Error("Parámetros requeridos");

  await updateDoc(doc(db, "tiendas", idTienda), {
    personal: arrayRemove(uidPersonal),
  });

  // Eliminar el campo idTienda del usuario (si existe)
  await updateDoc(doc(db, "usuarios", uidPersonal), {
    idTienda: null,
  });
}

/**
 * Asegura que el campo `rol` del usuario esté exactamente como "GERENTE".
 * Útil para normalizar valores que vienen con distinta capitalización.
 */
export async function asegurarRolGerente(uid) {
  if (!uid) throw new Error("UID requerido");
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Usuario no existe");
  const data = snap.data() || {};
  const current = (data.rol || data.role || "").toString();
  if (current !== "GERENTE") {
    await updateDoc(ref, { rol: "GERENTE" });
  }
}
export async function crearTipoInventario(idTienda, nombre, categorias = []) {
  if (!idTienda || !nombre) throw new Error("ID de tienda y nombre requeridos");

  const data = {
    tiendaId: idTienda,
    nombre,
    categorias,
    fechaCreacion: new Date(),
    activa: true,
  };

  const ref = await addDoc(collection(db, "tipos_inventario"), data);
  return ref.id;
}

export async function obtenerTiposInventarioPorTienda(idTienda) {
  if (!idTienda) return [];

  const q = query(collection(db, "tipos_inventario"), where("tiendaId", "==", idTienda));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function obtenerTipoInventarioPorId(idTipo) {
  if (!idTipo) return null;
  const snap = await getDoc(doc(db, "tipos_inventario", idTipo));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Actualiza el nombre y/o las categorías de un tipo de inventario existente.
 * @param {string} idTipo
 * @param {string} nombre
 * @param {Array} categorias
 */
export async function actualizarTipoInventario(idTipo, nombre, categorias = []) {
  if (!idTipo) throw new Error("ID de tipo de inventario requerido");

  await updateDoc(doc(db, "tipos_inventario", idTipo), {
    nombre,
    categorias,
    updatedAt: new Date(),
  });
}

/**
 * Elimina un tipo de inventario por su id.
 * @param {string} idTipo
 */
export async function eliminarTipoInventario(idTipo) {
  if (!idTipo) throw new Error("ID de tipo de inventario requerido");

  await deleteDoc(doc(db, "tipos_inventario", idTipo));
}

export async function obtenerInventariosPorTienda(idTienda) {
  if (!idTienda) return [];
  const q = query(collection(db, "inventarios"), where("tiendaId", "==", idTienda));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function obtenerInventarioPorId(idInventario) {
  if (!idInventario) return null;
  const snap = await getDoc(doc(db, "inventarios", idInventario));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function crearInventarioDesdeTipo(tipoInventarioId, tiendaId, usuario, itemDetails = {}, nombreInventario = "") {
  if (!tipoInventarioId || !tiendaId) throw new Error("Tipo de inventario y tienda son requeridos");

  const usuarioNombre = usuario?.nombre || usuario?.displayName || usuario?.correo || "Inventario";
  const nombreFinal = nombreInventario?.trim() || usuarioNombre;

  const tipo = await obtenerTipoInventarioPorId(tipoInventarioId);
  if (!tipo) throw new Error("Tipo de inventario no encontrado");

  const categorias = (tipo.categorias || []).map((cat) => ({
    nombre: cat.nombre,
    items: (cat.items || []).map((item) => {
      const key = `${cat.nombre}||${item.nombre}`;
      const detail = itemDetails[key] || { bodega: "", linea: "" };
      return {
        nombre: item.nombre,
        bodega: detail.bodega || "",
        linea: detail.linea || "",
      };
    }),
  }));

  const inventario = {
    tiendaId,
    tipoInventarioId,
    tipoInventarioNombre: tipo.nombre,
    nombreInventario: nombreFinal,
    fechaCreacion: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByUid: usuario?.id || usuario?.uid || null,
    createdByName: usuario?.nombre || usuario?.displayName || usuario?.correo || null,
    updatedByUid: usuario?.id || usuario?.uid || null,
    updatedByName: usuario?.nombre || usuario?.displayName || usuario?.correo || null,
    estado: "ABIERTA",
    categorias,
    itemDetails,
  };

  const ref = await addDoc(collection(db, "inventarios"), inventario);
  return ref.id;
}

export async function actualizarInventario(idInventario, data) {
  if (!idInventario) throw new Error("ID de inventario requerido");
  await updateDoc(doc(db, "inventarios", idInventario), {
    ...data,
    updatedAt: new Date(),
  });
}