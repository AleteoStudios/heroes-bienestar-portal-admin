const SUPABASE_URL = "https://hcnltjduiujgwjncrfge.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjbmx0amR1aXVqZ3dqbmNyZmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODE3MDIsImV4cCI6MjA5ODA1NzcwMn0.7yd6yaOxgZYeyyzJjKSfakaw4zj-ffQKG1utSRsk4Cg";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const qrCodeInput = document.getElementById("qrCodeInput");
const btnBuscar = document.getElementById("btnBuscar");
const urlStatus = document.getElementById("urlStatus");

const profileCard = document.getElementById("profileCard");
const historyCard = document.getElementById("historyCard");
const measurementCard = document.getElementById("measurementCard");

const btnGuardarMedicion = document.getElementById("btnGuardarMedicion");
const measurementStatus = document.getElementById("measurementStatus");

const inputNuevaEdad = document.getElementById("inputNuevaEdad");
const inputNuevaTalla = document.getElementById("inputNuevaTalla");
const inputNuevoPeso = document.getElementById("inputNuevoPeso");
const inputRegistradoPor = document.getElementById("inputRegistradoPor");

let perfilActual = null;

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

async function buscarPerfilHistorial(qrCode) {
    mostrarEstado(`Buscando perfil con código: ${qrCode}...`);
    ocultarResultados();

    const { data, error } = await supabaseClient
        .from("vw_profile_health_history")
        .select("*")
        .eq("qr_code", qrCode)
        .order("fecha_medicion", { ascending: false });

    if (error) {
        console.error(error);
        mostrarEstado("Error al consultar Supabase. Revisa consola o permisos RLS.", true);
        return;
    }

    if (!data || data.length === 0) {
        mostrarEstado("No se encontró ningún perfil con ese código QR.", true);
        return;
    }

    mostrarEstado(`Perfil encontrado: ${qrCode}`);

    mostrarPerfil(data[0]);
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

function mostrarHistorial(registros) {
    historyCard.classList.remove("hidden");

    const historyList = document.getElementById("historyList");

    if (!registros || registros.length === 0) {
        historyList.innerHTML = "No hay mediciones registradas.";
        return;
    }

    historyList.innerHTML = registros.map((record, index) => {
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
            </div>
        `;
    }).join("");
}

function llenarFormularioMedicion(perfil) {
    inputNuevaEdad.value = perfil.edad_actual || "";
    inputNuevaTalla.value = perfil.talla_actual_cm || "";
    inputNuevoPeso.value = perfil.peso_actual_kg || "";

    if (!inputRegistradoPor.value) {
        inputRegistradoPor.value = "Administrador portal";
    }

    measurementStatus.textContent = "Perfil listo para registrar nueva medición.";
    measurementStatus.classList.remove("error-text");
}

async function guardarNuevaMedicion() {
    if (!perfilActual) {
        measurementStatus.textContent = "Primero busca un perfil por QR.";
        measurementStatus.classList.add("error-text");
        return;
    }

    const edad = Number(inputNuevaEdad.value);
    const tallaCm = Number(inputNuevaTalla.value);
    const pesoKg = Number(inputNuevoPeso.value);
    const registradoPor = inputRegistradoPor.value.trim() || "Administrador portal";

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
        registrado_por: registradoPor
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

    measurementStatus.classList.remove("error-text");
    measurementStatus.textContent = "Medición guardada correctamente.";

    await buscarPerfilHistorial(perfilActual.qr_code);
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

function ocultarResultados() {
    profileCard.classList.add("hidden");
    historyCard.classList.add("hidden");
    measurementCard.classList.add("hidden");

    perfilActual = null;

    document.getElementById("historyList").innerHTML = "";

    if (measurementStatus) {
        measurementStatus.textContent = "Esperando perfil seleccionado...";
        measurementStatus.classList.remove("error-text");
    }
}

function mostrarEstado(mensaje, esError = false) {
    urlStatus.textContent = mensaje;
    urlStatus.classList.toggle("error-text", esError);
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

leerCodigoDesdeURL();