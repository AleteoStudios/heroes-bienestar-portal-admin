const SUPABASE_URL = "https://hcnltjduiujgwjncrfge.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjbmx0amR1aXVqZ3dqbmNyZmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODE3MDIsImV4cCI6MjA5ODA1NzcwMn0.7yd6yaOxgZYeyyzJjKSfakaw4zj-ffQKG1utSRsk4Cg";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginCard = document.getElementById("loginCard");
const portalCard = document.getElementById("portalCard");

const txtAdminSesion = document.getElementById("txtAdminSesion");

const inputEmail = document.getElementById("inputEmail");
const inputPassword = document.getElementById("inputPassword");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const loginStatus = document.getElementById("loginStatus");

const qrCodeInput = document.getElementById("qrCodeInput");
const btnBuscar = document.getElementById("btnBuscar");
const urlStatus = document.getElementById("urlStatus");

const profileCard = document.getElementById("profileCard");
const summaryCard = document.getElementById("summaryCard");
const historyCard = document.getElementById("historyCard");
const measurementCard = document.getElementById("measurementCard");

const btnGuardarMedicion = document.getElementById("btnGuardarMedicion");
const measurementStatus = document.getElementById("measurementStatus");

const inputNuevaEdad = document.getElementById("inputNuevaEdad");
const inputNuevaTalla = document.getElementById("inputNuevaTalla");
const inputNuevoPeso = document.getElementById("inputNuevoPeso");
const inputRegistradoPor = document.getElementById("inputRegistradoPor");
const inputObservaciones = document.getElementById("inputObservaciones");

let perfilActual = null;
let adminActual = null;

btnLogin.addEventListener("click", iniciarSesion);
btnLogout.addEventListener("click", cerrarSesion);

btnBuscar.addEventListener("click", () => {
    const qrCode = qrCodeInput.value.trim().toUpperCase();

    if (!qrCode) {
        mostrarEstado("Ingresa un código QR válido.", true);
        return;
    }

    buscarPerfilHistorial(qrCode);
});

btnGuardarMedicion.addEventListener("click", guardarNuevaMedicion);

function leerCodigoDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
        const qrCode = code.trim().toUpperCase();
        qrCodeInput.value = qrCode;
        buscarPerfilHistorial(qrCode);
    } else {
        mostrarEstado("Esperando código QR...");
    }
}

async function revisarSesionActiva() {
    const { data } = await supabaseClient.auth.getSession();

    if (!data.session) {
        mostrarLogin();
        limpiarDatosPerfilEnPantalla();
        return;
    }

    const adminProfile = await cargarPerfilAdministrador();

    if (!adminProfile || !adminProfile.activo) {
        await supabaseClient.auth.signOut();

        adminActual = null;
        perfilActual = null;

        limpiarCodigoURL();
        limpiarDatosPerfilEnPantalla();

        mostrarLoginStatus("Tu usuario no tiene acceso administrativo activo.", true);
        mostrarLogin();
        return;
    }

    mostrarPortal();
    leerCodigoDesdeURL();
}

async function iniciarSesion() {
    const email = inputEmail.value.trim();
    const password = inputPassword.value.trim();

    if (!email || !password) {
        mostrarLoginStatus("Ingresa correo y contraseña.", true);
        return;
    }

    mostrarLoginStatus("Iniciando sesión...");

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error(error);
        mostrarLoginStatus("No se pudo iniciar sesión. Verifica tus datos.", true);
        return;
    }

    const adminProfile = await cargarPerfilAdministrador();

    if (!adminProfile) {
        await supabaseClient.auth.signOut();

        adminActual = null;
        perfilActual = null;

        limpiarCodigoURL();
        limpiarDatosPerfilEnPantalla();

        mostrarLoginStatus("Tu usuario no tiene perfil administrativo asignado.", true);
        mostrarLogin();
        return;
    }

    if (!adminProfile.activo) {
        await supabaseClient.auth.signOut();

        adminActual = null;
        perfilActual = null;

        limpiarCodigoURL();
        limpiarDatosPerfilEnPantalla();

        mostrarLoginStatus("Tu usuario administrativo está inactivo.", true);
        mostrarLogin();
        return;
    }

    mostrarLoginStatus("Sesión iniciada correctamente.");
    mostrarPortal();

    leerCodigoDesdeURL();
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();

    adminActual = null;
    perfilActual = null;

    inputPassword.value = "";

    limpiarCodigoURL();
    limpiarDatosPerfilEnPantalla();
    ocultarResultados();

    if (txtAdminSesion) {
        txtAdminSesion.textContent = "---";
    }

    mostrarLoginStatus("Sesión cerrada.");
    mostrarLogin();
}

async function cargarPerfilAdministrador() {
    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (!sessionData.session) {
        adminActual = null;
        return null;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabaseClient
        .from("admin_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (error) {
        console.error(error);
        adminActual = null;
        return null;
    }

    adminActual = data;
    return data;
}

async function buscarPerfilHistorial(qrCode) {
    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (!sessionData.session) {
        mostrarEstado("Debes iniciar sesión para consultar perfiles.", true);
        mostrarLogin();
        return;
    }

    if (!adminActual) {
        const adminProfile = await cargarPerfilAdministrador();

        if (!adminProfile || !adminProfile.activo) {
            mostrarEstado("No tienes acceso administrativo activo.", true);
            mostrarLogin();
            return;
        }
    }

    mostrarEstado(`Buscando perfil con código: ${qrCode}...`);

    limpiarDatosPerfilEnPantalla();
    qrCodeInput.value = qrCode;
    ocultarResultados();

    let consulta = supabaseClient
    .from("vw_profile_health_history")
    .select("*")
    .eq("qr_code", qrCode)
    .order("fecha_medicion", { ascending: false });

if (adminActual.rol !== "admin") {
    if (!adminActual.cct) {
        mostrarEstado("Tu usuario no tiene CCT asignado. No puede consultar perfiles.", true);
        return;
    }

    consulta = consulta.eq("cct", adminActual.cct);
}

const { data, error } = await consulta;

    if (error) {
        console.error(error);
        mostrarEstado("Error al consultar Supabase. Revisa consola o permisos RLS.", true);
        return;
    }

   if (!data || data.length === 0) {
    if (adminActual.rol !== "admin") {
        mostrarEstado("No se encontró el perfil o no pertenece a tu CCT asignado.", true);
    } else {
        mostrarEstado("No se encontró ningún perfil con ese código QR.", true);
    }
    return;
}

    mostrarEstado(`Perfil encontrado: ${qrCode}`);

    limpiarCodigoURL();

    mostrarPerfil(data[0]);
    mostrarResumenEvolucion(data);
    mostrarHistorial(data);
}

function mostrarPerfil(perfil) {
    profileCard.classList.remove("hidden");
    measurementCard.classList.remove("hidden");

    perfilActual = perfil;
    llenarFormularioMedicion(perfil);

    document.getElementById("txtNombre").textContent = perfil.nombre || "---";
    document.getElementById("txtEdad").textContent = `${perfil.edad_actual || "---"} años`;
    document.getElementById("txtSexo").textContent = perfil.sexo || "---";
    document.getElementById("txtEscuela").textContent = perfil.escuela || "---";
    document.getElementById("txtCCT").textContent = perfil.cct || "---";
    document.getElementById("txtGrupo").textContent = perfil.grupo || "---";

    document.getElementById("txtTalla").textContent = formatoNumero(perfil.talla_actual_cm, 1, "cm");
    document.getElementById("txtPeso").textContent = formatoNumero(perfil.peso_actual_kg, 1, "kg");
    document.getElementById("txtIMC").textContent = formatoNumero(perfil.imc_actual, 2, "");
    document.getElementById("txtCategoria").textContent = perfil.categoria_actual || "---";
}

function mostrarResumenEvolucion(registros) {
    summaryCard.classList.remove("hidden");

    if (!registros || registros.length === 0) {
        document.getElementById("txtTotalMediciones").textContent = "0";
        document.getElementById("txtUltimaMedicion").textContent = "---";
        document.getElementById("txtCambioTalla").textContent = "---";
        document.getElementById("txtCambioPeso").textContent = "---";
        document.getElementById("txtCambioIMC").textContent = "---";
        return;
    }

    const registrosValidos = registros.filter(r => r.health_record_id);

    if (registrosValidos.length === 0) {
        document.getElementById("txtTotalMediciones").textContent = "0";
        document.getElementById("txtUltimaMedicion").textContent = "---";
        document.getElementById("txtCambioTalla").textContent = "---";
        document.getElementById("txtCambioPeso").textContent = "---";
        document.getElementById("txtCambioIMC").textContent = "---";
        return;
    }

    const ultima = registrosValidos[0];
    const primera = registrosValidos[registrosValidos.length - 1];

    const cambioTalla = Number(ultima.talla_medicion_cm) - Number(primera.talla_medicion_cm);
    const cambioPeso = Number(ultima.peso_medicion_kg) - Number(primera.peso_medicion_kg);
    const cambioIMC = Number(ultima.imc_medicion) - Number(primera.imc_medicion);

    document.getElementById("txtTotalMediciones").textContent = registrosValidos.length;
    document.getElementById("txtUltimaMedicion").textContent = formatoFecha(ultima.fecha_medicion);
    document.getElementById("txtCambioTalla").textContent = formatoCambio(cambioTalla, 1, "cm");
    document.getElementById("txtCambioPeso").textContent = formatoCambio(cambioPeso, 1, "kg");
    document.getElementById("txtCambioIMC").textContent = formatoCambio(cambioIMC, 2, "");
}

function mostrarHistorial(registros) {
    historyCard.classList.remove("hidden");

    const historyList = document.getElementById("historyList");

    if (!registros || registros.length === 0) {
        historyList.innerHTML = "No hay mediciones registradas.";
        return;
    }

    const registrosValidos = registros.filter(r => r.health_record_id);

    if (registrosValidos.length === 0) {
        historyList.innerHTML = "No hay mediciones registradas.";
        return;
    }

    historyList.innerHTML = registrosValidos.map((record, index) => {
        return `
            <div class="history-item">
                <strong>Medición ${index + 1}</strong>
                <p>Fecha: ${formatoFecha(record.fecha_medicion)}</p>
                <p>Edad: ${record.edad_medicion || "---"} años</p>
                <p>Talla: ${formatoNumero(record.talla_medicion_cm, 1, "cm")}</p>
                <p>Peso: ${formatoNumero(record.peso_medicion_kg, 1, "kg")}</p>
                <p>IMC: ${formatoNumero(record.imc_medicion, 2, "")}</p>
                <p>Categoría: ${record.categoria_medicion || "---"}</p>
                <p>Registrado por: ${record.registrado_por || "---"}</p>
                <p>Observaciones: ${record.observaciones || "---"}</p>
            </div>
        `;
    }).join("");
}

function llenarFormularioMedicion(perfil) {
    inputNuevaEdad.value = perfil.edad_actual || "";
    inputNuevaTalla.value = perfil.talla_actual_cm || "";
    inputNuevoPeso.value = perfil.peso_actual_kg || "";

    if (!inputRegistradoPor.value) {
        inputRegistradoPor.value = adminActual?.nombre || "Administrador portal";
    }

    measurementStatus.textContent = "Perfil listo para registrar nueva medición.";
    measurementStatus.classList.remove("error-text");
}

function obtenerUltimaMedicion() {
    if (!perfilActual) {
        return null;
    }

    return {
        edad: Number(perfilActual.edad_actual),
        tallaCm: Number(perfilActual.talla_actual_cm),
        pesoKg: Number(perfilActual.peso_actual_kg)
    };
}

function esMedicionDuplicada(edad, tallaCm, pesoKg) {
    const ultima = obtenerUltimaMedicion();

    if (!ultima) {
        return false;
    }

    const mismaEdad = ultima.edad === edad;
    const mismaTalla = Math.abs(ultima.tallaCm - tallaCm) < 0.01;
    const mismoPeso = Math.abs(ultima.pesoKg - pesoKg) < 0.01;

    return mismaEdad && mismaTalla && mismoPeso;
}

async function guardarNuevaMedicion() {
    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (!sessionData.session) {
        measurementStatus.textContent = "Debes iniciar sesión para registrar mediciones.";
        measurementStatus.classList.add("error-text");
        mostrarLogin();
        return;
    }

    if (!adminActual) {
        const adminProfile = await cargarPerfilAdministrador();

        if (!adminProfile || !adminProfile.activo) {
            measurementStatus.textContent = "No tienes acceso administrativo activo.";
            measurementStatus.classList.add("error-text");
            mostrarLogin();
            return;
        }
    }

    if (!perfilActual) {
        measurementStatus.textContent = "Primero busca un perfil por QR.";
        measurementStatus.classList.add("error-text");
        return;
    }

    if (adminActual.rol !== "admin") {
    if (!adminActual.cct || perfilActual.cct !== adminActual.cct) {
        measurementStatus.textContent = "No puedes registrar mediciones de un perfil fuera de tu CCT asignado.";
        measurementStatus.classList.add("error-text");
        return;
    }
}

    const edad = Number(inputNuevaEdad.value);
    const tallaCm = Number(inputNuevaTalla.value);
    const pesoKg = Number(inputNuevoPeso.value);
    const registradoPor = inputRegistradoPor.value.trim() || adminActual?.nombre || "Administrador portal";
    const observaciones = inputObservaciones.value.trim();

    if (!edad || !tallaCm || !pesoKg) {
        measurementStatus.textContent = "Completa edad, talla y peso.";
        measurementStatus.classList.add("error-text");
        return;
    }

    if (edad <= 0 || edad > 18) {
        measurementStatus.textContent = "La edad debe estar entre 1 y 18 años.";
        measurementStatus.classList.add("error-text");
        return;
    }

    if (tallaCm <= 40 || tallaCm > 220) {
        measurementStatus.textContent = "Verifica la talla ingresada.";
        measurementStatus.classList.add("error-text");
        return;
    }

    if (pesoKg <= 2 || pesoKg > 200) {
        measurementStatus.textContent = "Verifica el peso ingresado.";
        measurementStatus.classList.add("error-text");
        return;
    }

    if (esMedicionDuplicada(edad, tallaCm, pesoKg)) {
        measurementStatus.textContent = "No hubo cambios en edad, talla o peso. No se guardó una nueva medición.";
        measurementStatus.classList.add("error-text");
        return;
    }

    const imc = calcularIMC(tallaCm, pesoKg);
    const categoria = clasificarIMCProvisional(imc);

    measurementStatus.classList.remove("error-text");
    measurementStatus.textContent = "Guardando medición...";

    const nuevaMedicion = {
        profile_id: perfilActual.profile_id,
        edad: edad,
        sexo: perfilActual.sexo,
        talla_cm: Number(tallaCm.toFixed(2)),
        peso_kg: Number(pesoKg.toFixed(2)),
        imc: Number(imc.toFixed(2)),
        categoria_imc: categoria,
        registrado_por: registradoPor,
        observaciones: observaciones
    };

    const { error: errorMedicion } = await supabaseClient
        .from("health_records")
        .insert([nuevaMedicion]);

    if (errorMedicion) {
        console.error(errorMedicion);
        measurementStatus.textContent = "No se pudo guardar la medición.";
        measurementStatus.classList.add("error-text");
        return;
    }

    const datosActualizadosPerfil = {
        edad: edad,
        talla_cm: Number(tallaCm.toFixed(2)),
        peso_kg: Number(pesoKg.toFixed(2)),
        imc: Number(imc.toFixed(2)),
        categoria_imc: categoria
    };

    const { error: errorPerfil } = await supabaseClient
        .from("child_profiles")
        .update(datosActualizadosPerfil)
        .eq("id", perfilActual.profile_id);

    if (errorPerfil) {
        console.error(errorPerfil);
        measurementStatus.textContent = "La medición se guardó, pero no se pudo actualizar el perfil principal.";
        measurementStatus.classList.add("error-text");
        return;
    }

    const qrCode = perfilActual.qr_code;

    measurementStatus.classList.remove("error-text");
    measurementStatus.textContent = "Medición guardada correctamente.";

    inputObservaciones.value = "";

    await buscarPerfilHistorial(qrCode);
}

function mostrarLogin() {
    loginCard.classList.remove("hidden");
    portalCard.classList.add("hidden");

    profileCard.classList.add("hidden");
    summaryCard.classList.add("hidden");
    historyCard.classList.add("hidden");
    measurementCard.classList.add("hidden");
}

function mostrarPortal() {
    loginCard.classList.add("hidden");
    portalCard.classList.remove("hidden");

    if (adminActual && txtAdminSesion) {
        txtAdminSesion.textContent =
            `${adminActual.nombre} | Rol: ${adminActual.rol}` +
            (adminActual.cct ? ` | CCT: ${adminActual.cct}` : "");
    }
}

function ocultarResultados() {
    profileCard.classList.add("hidden");
    summaryCard.classList.add("hidden");
    historyCard.classList.add("hidden");
    measurementCard.classList.add("hidden");

    perfilActual = null;

    document.getElementById("historyList").innerHTML = "";

    if (measurementStatus) {
        measurementStatus.textContent = "Esperando perfil seleccionado...";
        measurementStatus.classList.remove("error-text");
    }
}

function limpiarCodigoURL() {
    const nuevaURL = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, nuevaURL);
}

function limpiarDatosPerfilEnPantalla() {
    qrCodeInput.value = "";

    document.getElementById("txtNombre").textContent = "---";
    document.getElementById("txtEdad").textContent = "---";
    document.getElementById("txtSexo").textContent = "---";
    document.getElementById("txtEscuela").textContent = "---";
    document.getElementById("txtCCT").textContent = "---";
    document.getElementById("txtGrupo").textContent = "---";

    document.getElementById("txtTalla").textContent = "---";
    document.getElementById("txtPeso").textContent = "---";
    document.getElementById("txtIMC").textContent = "---";
    document.getElementById("txtCategoria").textContent = "---";

    document.getElementById("txtTotalMediciones").textContent = "---";
    document.getElementById("txtUltimaMedicion").textContent = "---";
    document.getElementById("txtCambioTalla").textContent = "---";
    document.getElementById("txtCambioPeso").textContent = "---";
    document.getElementById("txtCambioIMC").textContent = "---";

    document.getElementById("historyList").innerHTML = "";

    inputNuevaEdad.value = "";
    inputNuevaTalla.value = "";
    inputNuevoPeso.value = "";
    inputRegistradoPor.value = "";
    inputObservaciones.value = "";

    measurementStatus.textContent = "Esperando perfil seleccionado...";
    measurementStatus.classList.remove("error-text");

    urlStatus.textContent = "Esperando código QR...";
    urlStatus.classList.remove("error-text");
}

function mostrarEstado(mensaje, esError = false) {
    urlStatus.textContent = mensaje;
    urlStatus.classList.toggle("error-text", esError);
}

function mostrarLoginStatus(mensaje, esError = false) {
    loginStatus.textContent = mensaje;
    loginStatus.classList.toggle("error-text", esError);
}

function calcularIMC(tallaCm, pesoKg) {
    const tallaMetros = tallaCm / 100;
    return pesoKg / (tallaMetros * tallaMetros);
}

function clasificarIMCProvisional(imc) {
    if (imc < 14.5) {
        return "Bajo peso";
    } else if (imc >= 14.5 && imc < 18.5) {
        return "Peso saludable";
    } else if (imc >= 18.5 && imc < 22.0) {
        return "Riesgo de sobrepeso";
    } else {
        return "Sobrepeso";
    }
}

function formatoCambio(valor, decimales, unidad) {
    if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
        return "---";
    }

    const numero = Number(valor);
    const unidadTexto = unidad ? ` ${unidad}` : "";

    if (Math.abs(numero) < 0.01) {
        return "Sin cambio — Estable";
    }

    const signo = numero > 0 ? "+" : "";
    const textoCambio = `${signo}${numero.toFixed(decimales)}${unidadTexto}`;

    if (numero > 0) {
        return `${textoCambio} — Aumento registrado`;
    }

    return `${textoCambio} — Disminución registrada`;
}

function formatoNumero(valor, decimales, unidad) {
    if (valor === null || valor === undefined || valor === "") {
        return "---";
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return "---";
    }

    return `${numero.toFixed(decimales)} ${unidad}`.trim();
}

function formatoFecha(fecha) {
    if (!fecha) {
        return "---";
    }

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
        return fecha;
    }

    return date.toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

revisarSesionActiva();