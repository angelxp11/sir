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

