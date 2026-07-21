const SUPABASE_URL = "https://hcnltjduiujgwjncrfge.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjbmx0amR1aXVqZ3dqbmNyZmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODE3MDIsImV4cCI6MjA5ODA1NzcwMn0.7yd6yaOxgZYeyyzJjKSfakaw4zj-ffQKG1utSRsk4Cg";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const qrCodeInput = document.getElementById("qrCodeInput");
const btnBuscar = document.getElementById("btnBuscar");
const urlStatus = document.getElementById("urlStatus");

const profileCard = document.getElementById("profileCard");
const historyCard = document.getElementById("historyCard");

btnBuscar.addEventListener("click", () => {
    const qrCode = qrCodeInput.value.trim().toUpperCase();

    if (!qrCode) {
        mostrarEstado("Ingresa un código QR válido.", true);
        return;
    }

    buscarPerfilHistorial(qrCode);
});

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

function ocultarResultados() {
    profileCard.classList.add("hidden");
    historyCard.classList.add("hidden");

    document.getElementById("historyList").innerHTML = "";
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