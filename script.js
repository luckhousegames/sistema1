// Initialize jsPDF & Chart (global, as they are loaded in <head>)
const jsPDFModule = window.jspdf ? window.jspdf.jsPDF : null; 
const ChartJS = window.Chart || null; 

if (!jsPDFModule) console.error("CRÍTICO: jsPDF não carregado! Geração de PDF não funcionará.");
else console.log("jsPDF carregado.");
if (!ChartJS) console.error("CRÍTICO: Chart.js não carregado! Gráficos não funcionarão.");
else console.log("Chart.js carregado.");

console.log("Luckhouse Games - Script.js: Iniciando carregamento...");

// --- GLOBAL APP STATE & CONFIG ---
let STORE_CONFIG = {}; 
let ORDENS_SERVICO = [];
let CLIENTES = [];
let PRODUTOS = [];
let SERVICOS = [];
let VENDAS = [];
let pdvCartItems = [];
let CURRENT_USER = { username: null, role: null };
let salesChartInstance = null;
window.clientFromPdvFlag = false; 
let osIdParaAcaoTecnico = null; 
let acaoTecnicoPendente = null; 

// --- UTILITY FUNCTIONS ---
function showToast(message, type = "primary", title = "Notificação") {
    try {
        const toastEl = document.getElementById('liveToast');
        const toastMessageEl = document.getElementById('toast-message');
        const toastTitleEl = document.getElementById('toast-title');
        if (!toastEl || !toastMessageEl || !toastTitleEl) {
            console.error("Elementos do Toast não encontrados! Mensagem:", message);
            alert(title + ": " + message); return;
        }
        const toastComponent = bootstrap.Toast.getOrCreateInstance(toastEl);
        toastMessageEl.textContent = message;
        toastTitleEl.textContent = title;
        const validBgClasses = ['bg-primary-custom', 'bg-success-custom', 'bg-danger-custom', 'bg-warning', 'bg-info-custom', 'text-white'];
        toastEl.classList.remove(...validBgClasses);
        toastMessageEl.classList.remove('text-white'); 
        toastTitleEl.classList.remove('text-white');
        let newClass = 'bg-primary-custom'; let addTextWhite = true;
        if (type === "success") newClass = 'bg-success-custom';
        else if (type === "danger") newClass = 'bg-danger-custom';
        else if (type === "warning") { newClass = 'bg-warning'; addTextWhite = false; }
        else if (type === "info") newClass = 'bg-info-custom';
        toastEl.classList.add(newClass);
        if (addTextWhite) { toastEl.classList.add('text-white'); toastMessageEl.classList.add('text-white'); toastTitleEl.classList.add('text-white'); }
        if(toastComponent) toastComponent.show(); else console.error("Toast component não inicializado.");
    } catch (error) { console.error("Erro ao mostrar toast:", error, message); }
}

function formatCurrency(value) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "R$ --,--"; 
    return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getNextId(collection) {
    if (!Array.isArray(collection) || collection.length === 0) return 1;
    const maxId = Math.max(0, ...collection.map(item => Number(item.id) || 0));
    return maxId + 1;
}

// --- LOCALSTORAGE DATA MANAGEMENT ---
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Dados SALVOS para chave "${key}". Itens:`, Array.isArray(data) ? data.length : '(Objeto)');
    } catch (e) { console.error("Erro ao salvar dados na localStorage para chave", key, e); showToast(`Erro ao salvar (${key}).`, "danger"); }
}

function loadData(key, defaultValue = []) {
    const dataFromStorage = localStorage.getItem(key);
    if (dataFromStorage) {
        try {
            const parsedData = JSON.parse(dataFromStorage);
            console.log(`Dados CARREGADOS da chave "${key}". Itens:`, Array.isArray(parsedData) ? parsedData.length : '(Objeto)');
            return parsedData;
        } catch (e) {
            console.error(`Erro ao parsear JSON da chave "${key}":`, e, "\nConteúdo:", dataFromStorage);
            showToast(`Erro ao carregar dados (${key}). Resetando para padrão.`, "warning");
            localStorage.removeItem(key); 
        }
    }
    console.log(`Nenhum dado para chave "${key}", usando default.`);
    return Array.isArray(defaultValue) ? [...defaultValue] : (typeof defaultValue === 'object' && defaultValue !== null ? {...defaultValue} : defaultValue);
}

function loadAppConfig() {
    const defaultConfig = {
        nomeLoja: "Luckhouse Games", cnpj: "43.864.000/198",
        endereco: "Av. Itália, 200 – Shopping Amarilys, Itupeva – SP",
        telefone: "(11) 99357-7209", email: "luckhousegames@gmail.com",
        logoUrl: "assets/logo.png", diasGarantiaPadrao: 90, tecnicoWhatsapp: ""
    };
    STORE_CONFIG = loadData('luckhouse_config', defaultConfig);
    updateStoreInfoUI();
}

function saveAppConfig() {
    saveData('luckhouse_config', STORE_CONFIG);
    updateStoreInfoUI();
    showToast("Configurações salvas!", "success");
}

function updateStoreInfoUI() {
    try {
        const el = (id) => document.getElementById(id);
        const sidebarLogoImg = el('sidebar-logo-img');
        const sidebarLogoText = el('sidebar-logo-text');
        const sidebarStoreNameDisplay = el('sidebar-store-name-display');
        
        if (sidebarLogoImg && sidebarLogoText && sidebarStoreNameDisplay) {
            if (STORE_CONFIG.logoUrl && STORE_CONFIG.logoUrl.trim() !== "") { 
                sidebarLogoImg.src = STORE_CONFIG.logoUrl; 
                sidebarLogoImg.style.display = 'block'; 
                sidebarLogoText.style.display = 'none'; 
            } else { 
                sidebarLogoImg.style.display = 'none'; 
                sidebarLogoText.style.display = 'block'; 
            }
            sidebarStoreNameDisplay.textContent = STORE_CONFIG.nomeLoja;
        }
        if (el('footer-store-name')) el('footer-store-name').textContent = STORE_CONFIG.nomeLoja;
        if (el('footer-store-name-2')) el('footer-store-name-2').textContent = STORE_CONFIG.nomeLoja;
        if (el('footer-cnpj')) el('footer-cnpj').textContent = STORE_CONFIG.cnpj;
        if (el('footer-address')) el('footer-address').textContent = STORE_CONFIG.endereco;
        if (el('footer-phone')) el('footer-phone').textContent = STORE_CONFIG.telefone;
        if (el('footer-email')) el('footer-email').textContent = STORE_CONFIG.email;
        
        const configNomeLojaEl = el('config-nome-loja');
        const configSection = document.querySelector('#configuracoes');
        if (configNomeLojaEl && configSection && !configSection.classList.contains('d-none')) {
            configNomeLojaEl.value = STORE_CONFIG.nomeLoja || '';
            el('config-cnpj').value = STORE_CONFIG.cnpj || '';
            el('config-endereco').value = STORE_CONFIG.endereco || '';
            el('config-telefone').value = STORE_CONFIG.telefone || '';
            el('config-email').value = STORE_CONFIG.email || '';
            el('config-logo-url').value = STORE_CONFIG.logoUrl || '';
            el('config-garantia-dias').value = STORE_CONFIG.diasGarantiaPadrao || 90;
            el('config-tecnico-whatsapp').value = STORE_CONFIG.tecnicoWhatsapp || '';
        }
        updateTermoGarantiaPreview();
    } catch (error) { console.error("Erro em updateStoreInfoUI:", error); }
}

function updateTermoGarantiaPreview() {
    const osTermosPreview = document.getElementById('os-termos-garantia-preview');
    if (osTermosPreview) {
        osTermosPreview.innerHTML = `
            <p>Garantia de ${STORE_CONFIG.diasGarantiaPadrao || 90} dias após entrega.</p>
            <p>Não nos responsabilizamos por danos causados por mau uso ou quedas após o reparo.</p>
            <p>Equipamentos não retirados em até 90 dias serão descartados ou reaproveitados conforme política da loja.</p>`;
    }
}

// --- LOGIN & AUTHENTICATION (SIMULATED) ---
function handleLogin(event) {
    event.preventDefault(); 
    console.log("handleLogin: Tentativa de login iniciada.");
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorMessageEl = document.getElementById('login-error-message');

    if (!usernameInput || !passwordInput || !errorMessageEl) { 
        console.error("handleLogin: Elementos do formulário de login não encontrados."); 
        showToast("Erro interno no formulário de login.", "danger");
        return; 
    }
    const username = usernameInput.value;
    const password = passwordInput.value;
    console.log("handleLogin: Credenciais fornecidas - Usuário:", username, "/ Senha:", password ? "******" : "(vazio)");

    if (username === 'luckmaster' && password === 'L@1998*') { CURRENT_USER = {username: 'Luck Master', role: 'admin'}; }
    else if (username === 'Henrique Del Peso' && password === 'hdp123') { CURRENT_USER = {username: 'Henrique Del Peso', role: 'padrao'}; }
    else { errorMessageEl.classList.remove('d-none'); console.log("handleLogin: Credenciais inválidas."); return; }

    errorMessageEl.classList.add('d-none');
    saveData('luckhouse_currentUser', CURRENT_USER);
    console.log("handleLogin: Usuário salvo no localStorage:", CURRENT_USER);
    
    updateUIAfterLogin(); 
    
    const modalLoginEl = document.getElementById('modalLogin');
    if (modalLoginEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalLoginEl);
        if (modalInstance && modalInstance['_isShown']) {
            modalInstance.hide();
            console.log("handleLogin: Modal de login escondido.");
        }
    } else { console.error("handleLogin: Modal de login não encontrado para esconder."); }
    
    showToast(`Bem-vindo(a), ${CURRENT_USER.username}!`, "success");
    navigateToSection('dashboard'); 
    setupAllModules(); 
}

function handleLogout() {
    console.log("handleLogout: Iniciando processo de logout.");
    if (!confirm("Tem certeza que deseja sair?")) { console.log("handleLogout: Logout cancelado pelo usuário."); return; }
    CURRENT_USER = {username: null, role: null};
    localStorage.removeItem('luckhouse_currentUser');
    updateUIAfterLogin(); 
    showToast("Você saiu do sistema.", "info");
    
    const modalLoginEl = document.getElementById('modalLogin');
    if (modalLoginEl) {
         const loginModalInstance = bootstrap.Modal.getOrCreateInstance(modalLoginEl);
         if (loginModalInstance && !loginModalInstance['_isShown']) loginModalInstance.show();
    } else { console.error("handleLogout: Modal de login não encontrado para exibir."); }
}

function checkLoginState() {
    console.log("checkLoginState: Verificando estado de login...");
    const storedUser = loadData('luckhouse_currentUser', null);
    if (storedUser && storedUser.username && storedUser.role) {
        CURRENT_USER = storedUser;
        console.log("checkLoginState: Usuário encontrado no localStorage:", CURRENT_USER);
        updateUIAfterLogin();
        navigateToSection('dashboard'); 
        setupAllModules(); 
    } else {
        console.log("checkLoginState: Nenhum usuário logado encontrado. Exibindo UI de login.");
        updateUIAfterLogin(); 
        const modalLoginEl = document.getElementById('modalLogin');
        if (modalLoginEl) {
            const loginModalInstance = bootstrap.Modal.getOrCreateInstance(modalLoginEl);
            if (loginModalInstance && !loginModalInstance['_isShown']) {
                 loginModalInstance.show();
            }
        } else { console.error("checkLoginState: Modal de login não encontrado para ser exibido."); }
    }
}

function updateUIAfterLogin() {
    console.log("updateUIAfterLogin: Atualizando UI para usuário:", CURRENT_USER.username, "Role:", CURRENT_USER.role);
    const el = id => document.getElementById(id);
    const loggedInUserEl = el('logged-in-user');
    const logoutButton = el('logout-button');
    const adminNavItems = document.querySelectorAll('.nav-item-admin'); 
    const mainContentSections = document.querySelectorAll('.main-content'); 
    const loginPromptSection = el('login-prompt');
    const dashboardUsernameEl = el('dashboard-username');

    if (CURRENT_USER.username) {
        console.log("updateUIAfterLogin: Configurando UI para usuário LOGADO.");
        if(loggedInUserEl) loggedInUserEl.textContent = `Logado: ${CURRENT_USER.username} (${CURRENT_USER.role})`;
        if(logoutButton) logoutButton.style.display = 'block';
        if(loginPromptSection) loginPromptSection.classList.add('d-none');
        if(dashboardUsernameEl) dashboardUsernameEl.textContent = CURRENT_USER.username;
        mainContentSections.forEach(section => section.classList.remove('d-none'));
        adminNavItems.forEach(item => item.classList.toggle('d-none', CURRENT_USER.role !== 'admin'));
        
        const activeSection = document.querySelector('.content-section:not(.d-none):not(#login-prompt)');
        if (activeSection && activeSection.id === 'admin-area' && CURRENT_USER.role !== 'admin') {
            console.log("updateUIAfterLogin: Usuário não admin tentou acessar área admin, redirecionando para dashboard.");
            navigateToSection('dashboard');
        } else if (activeSection && activeSection.id === 'admin-area' && CURRENT_USER.role === 'admin') {
             renderAdminDashboard(); 
        }
    } else { 
        console.log("updateUIAfterLogin: Configurando UI para estado NÃO LOGADO.");
        if(loggedInUserEl) loggedInUserEl.textContent = 'Não Logado';
        if(logoutButton) logoutButton.style.display = 'none';
        if(loginPromptSection) loginPromptSection.classList.remove('d-none'); 
        if(dashboardUsernameEl) dashboardUsernameEl.textContent = "Usuário";
        mainContentSections.forEach(section => section.classList.add('d-none')); 
        const adminArea = el('admin-area'); 
        if(adminArea) adminArea.classList.add('d-none');
        adminNavItems.forEach(item => item.classList.add('d-none'));
    }
}

// --- MODULE SETUP FUNCTIONS ---
function setupAllModules() {
    console.groupCollapsed("setupAllModules: Configurando todos os módulos...");
    try {
        setupConfiguracoesModule();
        setupClientesModule();
        setupProdutosModule();
        setupServicosModule();
        setupOSModule();
        setupPdvModule();
        setupAdminAreaModule();
        setupSearchFilterListeners();
        setupBackupRestoreModule();
        setupModalServicoTecnico();
        console.log("Todos os módulos configurados com sucesso.");
    } catch (error) {
        console.error("ERRO CRÍTICO em setupAllModules:", error);
        showToast("Erro ao configurar módulos da aplicação. Verifique o console.", "danger");
    }
    console.groupEnd();
}

function setupConfiguracoesModule() {
    console.log("Configurando módulo: Configurações");
    const form = document.getElementById('formConfiguracoes');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("Salvando configurações...");
            STORE_CONFIG.nomeLoja = document.getElementById('config-nome-loja').value;
            STORE_CONFIG.cnpj = document.getElementById('config-cnpj').value;
            STORE_CONFIG.endereco = document.getElementById('config-endereco').value;
            STORE_CONFIG.telefone = document.getElementById('config-telefone').value;
            STORE_CONFIG.email = document.getElementById('config-email').value;
            STORE_CONFIG.logoUrl = document.getElementById('config-logo-url').value.trim();
            STORE_CONFIG.diasGarantiaPadrao = parseInt(document.getElementById('config-garantia-dias').value) || 90;
            STORE_CONFIG.tecnicoWhatsapp = document.getElementById('config-tecnico-whatsapp').value.trim();
            saveAppConfig();
        });
    } else { console.error("Formulário de Configurações (formConfiguracoes) não encontrado."); }
}

function setupClientesModule() {
    console.log("Configurando módulo: Clientes");
    const form = document.getElementById('formNovoCliente');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const idInput = document.getElementById('cliente-id');
            const id = idInput ? idInput.value : '';
            const cliente = {
                id: id ? parseInt(id) : getNextId(CLIENTES),
                nome: document.getElementById('cliente-nome').value,
                telefone: document.getElementById('cliente-telefone').value,
                cpf: document.getElementById('cliente-cpf').value,
                email: document.getElementById('cliente-email').value,
                endereco: document.getElementById('cliente-endereco').value,
            };
            if (!cliente.nome || !cliente.telefone) { showToast("Nome e Telefone são obrigatórios.", "warning"); return; }
            if (id) { 
                const i = CLIENTES.findIndex(c=>c.id=== parseInt(id)); 
                if(i>-1) CLIENTES[i]=cliente; 
                else { CLIENTES.push(cliente); console.warn("Editando cliente não encontrado no array, adicionando como novo.")} 
            } else { CLIENTES.push(cliente); }
            saveClientes();
            showToast(`Cliente ${cliente.nome} ${id ? 'atualizado' : 'salvo'}!`, "success");
            const modalEl = document.getElementById('modalNovoCliente');
            if(modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
            form.reset(); 
            if(idInput) idInput.value = '';
            if (window.clientFromPdvFlag) {
                populatePdvClienteSelect();
                const pdvSelect = document.getElementById('pdv-cliente-select');
                if (pdvSelect) pdvSelect.value = cliente.id; 
                fillPdvClientReceiptFields(); 
                window.clientFromPdvFlag = false; 
            }
        });
    }  else { console.error("Formulário formNovoCliente não encontrado."); }
    const btnSearch = document.getElementById('btn-search-client');
    if(btnSearch) btnSearch.addEventListener('click', filterClientList);
    else { console.error("Botão btn-search-client não encontrado."); }
}

function loadClientes() { CLIENTES = loadData('luckhouse_clientes', []); renderClientList(); populateClienteSelect(); populatePdvClienteSelect(); }
function saveClientes() { saveData('luckhouse_clientes', CLIENTES); renderClientList(); populateClienteSelect(); populatePdvClienteSelect(); }

function renderClientList(filteredClients = null) {
    const tbody = document.getElementById('client-list-tbody');
    if(!tbody) { console.error("Tbody de clientes (client-list-tbody) não encontrado."); return; }
    tbody.innerHTML = '';
    const listToRender = filteredClients ? filteredClients : CLIENTES;
    if (listToRender.length === 0) { tbody.innerHTML = '<tr class="no-clients-message"><td colspan="5" class="text-center text-muted">Nenhum cliente.</td></tr>'; return; }
    listToRender.sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.nome}</td><td>${c.telefone||'-'}</td><td>${c.cpf||'-'}</td><td>${c.email||'-'}</td>
                           <td><button class="btn btn-sm btn-warning-custom me-1" onclick="window.editCliente(${c.id})"><i class="fas fa-edit"></i></button>
                               <button class="btn btn-sm btn-danger-custom" onclick="window.deleteCliente(${c.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
}

window.editCliente = function(id) {
    const cliente = CLIENTES.find(c => c.id === id);
    if (cliente) {
        try {
            const form = document.getElementById('formNovoCliente');
            if(form) form.reset(); else { console.error("formNovoCliente não encontrado em editCliente."); return; }
            const el = (idForm) => document.getElementById(idForm);
            if(el('cliente-id')) el('cliente-id').value = cliente.id;
            if(el('cliente-nome')) el('cliente-nome').value = cliente.nome;
            if(el('cliente-telefone')) el('cliente-telefone').value = cliente.telefone;
            if(el('cliente-cpf')) el('cliente-cpf').value = cliente.cpf || ''; 
            if(el('cliente-email')) el('cliente-email').value = cliente.email || '';
            if(el('cliente-endereco')) el('cliente-endereco').value = cliente.endereco || '';
            const modalEl = el('modalNovoCliente');
            if(modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
            else console.error("Modal 'modalNovoCliente' não encontrado para exibir.");
        } catch (e) { console.error("Erro em editCliente:", e); showToast("Erro ao tentar editar cliente.", "danger"); }
    } else { showToast("Cliente não encontrado.", "warning");}
};
window.deleteCliente = function(id) { if (confirm("Excluir este cliente?")) { CLIENTES = CLIENTES.filter(c => c.id !== id); saveClientes(); showToast("Cliente excluído.", "success"); }};

function populateClienteSelect() {
    const select = document.getElementById('os-cliente-select');
    if(!select) { console.warn("Select de cliente para OS (os-cliente-select) não encontrado."); return; }
    const currentVal = select.value; 
    select.innerHTML = '<option value="">Selecione um cliente...</option>';
    CLIENTES.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nome} (${c.telefone || 'Sem tel.'} / CPF: ${c.cpf || 'N/A'})</option>`;
    });
    if (CLIENTES.find(c => c.id === parseInt(currentVal))) { select.value = currentVal; }
}

function populatePdvClienteSelect() {
    const select = document.getElementById('pdv-cliente-select');
    if(!select) { console.warn("Select de cliente para PDV (pdv-cliente-select) não encontrado."); return; }
    const currentVal = select.value;
    select.innerHTML = '<option value="">Consumidor (Não Identificado)</option>';
    CLIENTES.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nome} (CPF: ${c.cpf || 'N/A'})</option>`;
    });
     if (CLIENTES.find(c => c.id === parseInt(currentVal))) { select.value = currentVal; }
}

function openNewClientModalFromOS() {
    window.clientFromPdvFlag = false; 
    const modalNovaOS = document.getElementById('modalNovaOS');
    const modalNovoCliente = document.getElementById('modalNovoCliente');
    const formNovoCliente = document.getElementById('formNovoCliente');
    const clienteIdInput = document.getElementById('cliente-id');

    if (modalNovaOS) bootstrap.Modal.getInstance(modalNovaOS)?.hide();
    if (formNovoCliente) formNovoCliente.reset();
    if (clienteIdInput) clienteIdInput.value = '';
    if (modalNovoCliente) bootstrap.Modal.getOrCreateInstance(modalNovoCliente).show();
    else { console.error("Modal modalNovoCliente não encontrado."); }
}

function setupProdutosModule() {
    const form = document.getElementById('formNovoProduto');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const idInput = document.getElementById('produto-id');
            const id = idInput ? idInput.value : '';
            const produto = {
                id: id ? parseInt(id) : getNextId(PRODUTOS),
                nome: document.getElementById('produto-nome').value,
                categoria: document.getElementById('produto-categoria').value,
                precoVenda: parseFloat(document.getElementById('produto-preco').value),
                estoque: parseInt(document.getElementById('produto-estoque').value) || 0,
                isVideogame: document.getElementById('produto-is-videogame').checked,
                consignado: document.getElementById('produto-consignado').checked, 
                tipo: 'produto'
            };
            if (!produto.nome || isNaN(produto.precoVenda) || produto.precoVenda <= 0) { showToast("Nome e Preço válido são obrigatórios.", "warning"); return; }
            if (id) { const i = PRODUTOS.findIndex(p=>p.id=== parseInt(id)); if(i>-1) PRODUTOS[i]=produto; else {PRODUTOS.push(produto); console.warn("Editando produto não encontrado, adicionando como novo.");}}
            else { PRODUTOS.push(produto); }
            saveProdutos();
            showToast(`Produto ${produto.nome} ${id ? 'atualizado' : 'salvo'}!`, "success");
            bootstrap.Modal.getInstance(document.getElementById('modalNovoProduto'))?.hide();
            form.reset(); if(idInput) idInput.value = '';
        });
    } else { console.error("Formulário formNovoProduto não encontrado."); }
}
function loadProdutos() { PRODUTOS = loadData('luckhouse_produtos', []); renderProductList(); renderPdvItemList(); }
function saveProdutos() { saveData('luckhouse_produtos', PRODUTOS); renderProductList(); renderPdvItemList(); }
function renderProductList(filteredList = null) {
    const tbody = document.getElementById('product-list-tbody');
    if(!tbody) { console.error("Tbody de produto (product-list-tbody) não encontrado."); return; }
    tbody.innerHTML = '';
    const listToRender = filteredList ? filteredList : PRODUTOS;
    if (listToRender.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum produto.</td></tr>'; return; } 
    listToRender.sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(p => {
        tbody.innerHTML += `<tr><td>${p.nome}</td><td>${p.categoria||'-'}</td><td>${p.isVideogame ? 'Sim' : 'Não'}</td><td>${p.consignado ? 'Sim' : 'Não'}</td><td>${formatCurrency(p.precoVenda)}</td><td>${p.estoque}</td>
                           <td><button class="btn btn-sm btn-warning-custom me-1" onclick="window.editProduto(${p.id})"><i class="fas fa-edit"></i></button>
                               <button class="btn btn-sm btn-danger-custom" onclick="window.deleteProduto(${p.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
}
window.editProduto = function(id) {
    const p = PRODUTOS.find(item => item.id === id);
    if(p){
        const form = document.getElementById('formNovoProduto'); 
        if(form) form.reset(); else { console.error("formNovoProduto não encontrado em editProduto"); return; }
        document.getElementById('produto-id').value = p.id;
        document.getElementById('produto-nome').value = p.nome;
        document.getElementById('produto-categoria').value = p.categoria || '';
        document.getElementById('produto-preco').value = p.precoVenda;
        document.getElementById('produto-estoque').value = p.estoque;
        document.getElementById('produto-is-videogame').checked = p.isVideogame || false;
        document.getElementById('produto-consignado').checked = p.consignado || false; 
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalNovoProduto')).show();
    } else { showToast("Produto não encontrado.", "warning"); }
};
window.deleteProduto = function(id) { if(confirm('Excluir este produto?')) { PRODUTOS = PRODUTOS.filter(p => p.id !== id); saveProdutos(); showToast('Produto excluído.', 'success'); }};

function setupServicosModule() {
    const form = document.getElementById('formNovoServico');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const idInput = document.getElementById('servico-id');
            const id = idInput ? idInput.value : '';
            const servico = {
                id: id ? parseInt(id) : getNextId(SERVICOS),
                nome: document.getElementById('servico-nome').value,
                descricao: document.getElementById('servico-descricao').value,
                valor: parseFloat(document.getElementById('servico-valor').value), 
                custoTecnico: parseFloat(document.getElementById('servico-custo-tecnico').value) || 0, 
                tipo: 'servico'
            };
            if (!servico.nome || isNaN(servico.valor) || servico.valor <= 0) { showToast("Nome e Valor para Cliente são obrigatórios e devem ser válidos.", "warning"); return; }
            if (isNaN(servico.custoTecnico) || servico.custoTecnico < 0) { showToast("Custo do técnico inválido.", "warning"); return; }

            if (id) { const i = SERVICOS.findIndex(s=>s.id=== parseInt(id)); if(i>-1) SERVICOS[i]=servico; else {SERVICOS.push(servico); console.warn("Editando serviço não encontrado, adicionando como novo.");}}
            else { SERVICOS.push(servico); }
            saveServicos();
            showToast(`Serviço ${servico.nome} ${id ? 'atualizado' : 'salvo'}!`, "success");
            bootstrap.Modal.getInstance(document.getElementById('modalNovoServico'))?.hide();
            form.reset(); if(idInput) idInput.value = '';
        });
    } else { console.error("Formulário formNovoServico não encontrado."); }
}
function loadServicos() { SERVICOS = loadData('luckhouse_servicos', []); renderServiceList(); renderPdvItemList(); }
function saveServicos() { saveData('luckhouse_servicos', SERVICOS); renderServiceList(); renderPdvItemList(); }
function renderServiceList(filteredList = null) {
    const tbody = document.getElementById('service-list-tbody');
    if(!tbody) { console.error("Tbody de serviço (service-list-tbody) não encontrado."); return; }
    tbody.innerHTML = '';
    const listToRender = filteredList ? filteredList : SERVICOS;
    if (listToRender.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum serviço.</td></tr>'; return; }
    listToRender.sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(s => {
        tbody.innerHTML += `<tr><td>${s.nome}</td><td>${s.descricao||'-'}</td><td>${formatCurrency(s.custoTecnico)}</td><td>${formatCurrency(s.valor)}</td>
                           <td><button class="btn btn-sm btn-warning-custom me-1" onclick="window.editServico(${s.id})"><i class="fas fa-edit"></i></button>
                               <button class="btn btn-sm btn-danger-custom" onclick="window.deleteServico(${s.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
}
window.editServico = function(id) {
    const s = SERVICOS.find(item => item.id === id);
    if(s){
        const form = document.getElementById('formNovoServico'); 
        if(form) form.reset(); else { console.error("formNovoServico não encontrado em editServico"); return; }
        document.getElementById('servico-id').value = s.id;
        document.getElementById('servico-nome').value = s.nome;
        document.getElementById('servico-descricao').value = s.descricao || '';
        document.getElementById('servico-valor').value = s.valor;
        document.getElementById('servico-custo-tecnico').value = s.custoTecnico || 0;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalNovoServico')).show();
    } else { showToast("Serviço não encontrado.", "warning"); }
};
window.deleteServico = function(id) { if(confirm('Excluir este serviço?')) { SERVICOS = SERVICOS.filter(s => s.id !== id); saveServicos(); showToast('Serviço excluído.', 'success'); }};

function setupOSModule() {
    const form = document.getElementById('formNovaOS');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const idInput = document.getElementById('os-id');
            const id = idInput ? idInput.value : '';
            const clienteId = document.getElementById('os-cliente-select').value;
            const cliente = CLIENTES.find(c=>c.id === parseInt(clienteId));
            if(!cliente) { showToast("Cliente inválido selecionado para a OS.", "danger"); return; }
            const os = {
                id: id ? parseInt(id) : getNextId(ORDENS_SERVICO),
                clienteId: cliente.id, clienteNome: cliente.nome, clienteTelefone: cliente.telefone, clienteCpf: cliente.cpf,
                status: document.getElementById('os-status').value,
                equipamentoTipo: document.getElementById('os-equip-tipo').value,
                equipamentoMarca: document.getElementById('os-equip-marca').value,
                equipamentoModelo: document.getElementById('os-equip-modelo').value,
                equipamentoSerial: document.getElementById('os-equip-serial').value,
                problemaDescricao: document.getElementById('os-problema').value,
                diagnosticoTecnico: document.getElementById('os-diagnostico-tecnico').value,
                acessoriosInclusos: document.getElementById('os-acessorios-inclusos').value,
                observacoes: document.getElementById('os-observacoes').value,
                valorOrcamento: parseFloat(document.getElementById('os-orcamento').value) || 0,
                // custoTecnico foi removido daqui, virá do serviço selecionado no modal
                dataAbertura: id ? (ORDENS_SERVICO.find(o=>o.id===parseInt(id))?.dataAbertura || new Date().toISOString()) : new Date().toISOString(),
                dataConclusao: null 
            };
            if (!os.clienteId || !os.equipamentoTipo || !os.equipamentoMarca || !os.equipamentoModelo || !os.problemaDescricao || isNaN(os.valorOrcamento)) { showToast("Campos obrigatórios da OS não preenchidos ou orçamento inválido.", "warning"); return; }
            if (id) { const i = ORDENS_SERVICO.findIndex(o=>o.id === parseInt(id)); if(i>-1) ORDENS_SERVICO[i]=os; else {ORDENS_SERVICO.push(os); console.warn("Editando OS não encontrada, adicionando como nova.");}}
            else { ORDENS_SERVICO.push(os); }
            saveOrdensServico();
            showToast(`OS #${String(os.id).padStart(3,'0')} ${id ? 'atualizada' : 'salva'}!`, "success");
            bootstrap.Modal.getInstance(document.getElementById('modalNovaOS'))?.hide();
            form.reset(); if(idInput) idInput.value = '';
        });
    } else { console.error("Formulário formNovaOS não encontrado."); }
    const btnSearch = document.getElementById('btn-search-os');
    if(btnSearch) btnSearch.addEventListener('click', filterOSList); else { console.error("Botão btn-search-os não encontrado.");}
    const linkNewClient = document.getElementById('link-novo-cliente-from-os');
    if (linkNewClient) linkNewClient.addEventListener('click', (e) => { e.preventDefault(); openNewClientModalFromOS(); });
    else { console.error("Link link-novo-cliente-from-os não encontrado.");}
}
function loadOrdensServico() { ORDENS_SERVICO = loadData('luckhouse_os', []); renderOSList(); renderDashboardOSRecentes(); }
function saveOrdensServico() { saveData('luckhouse_os', ORDENS_SERVICO); renderOSList(); renderDashboardOSRecentes(); }
function getStatusBadgeClass(status) { 
    if (!status) return 'badge rounded-pill me-2 bg-secondary';
    const s=status.toLowerCase().replace(/\s+/g,'-').replace(/[^\w-]+/g,''); 
    return `badge rounded-pill me-2 status-${s}`; 
}
function renderOSList(filteredOS = null) {
    const container = document.getElementById('os-list-container');
    if(!container) { console.error("Container de lista de OS (os-list-container) não encontrado."); return; }
    container.innerHTML = '';
    const listToRender = filteredOS ? filteredOS : ORDENS_SERVICO;
    if (listToRender.length === 0) { container.innerHTML = '<p class="text-muted p-2 no-os-message">Nenhuma OS encontrada.</p>'; return; }
    listToRender.sort((a,b)=>b.id-a.id).forEach(os => {
        const cliente = CLIENTES.find(c=>c.id===os.clienteId) || {nome:'Cliente Desconhecido'};
        container.innerHTML += `
            <div class="list-group-item list-group-item-action bg-dark-secondary text-white mb-2 rounded shadow-sm os-item" data-id="${os.id}" data-cliente="${cliente.nome.toLowerCase()}" data-equipamento="${(os.equipamentoTipo+' '+os.equipamentoMarca+' '+os.equipamentoModelo).toLowerCase()}" data-status="${(os.status || '').toLowerCase()}">
                <div class="d-flex w-100 justify-content-between"> <h5 class="mb-1 text-primary-custom">OS #${String(os.id).padStart(3,'0')} - ${cliente.nome}</h5> <span class="${getStatusBadgeClass(os.status)}">${os.status || 'N/A'}</span> </div>
                <p class="mb-1"><strong>Equip:</strong> ${os.equipamentoTipo} ${os.equipamentoMarca} ${os.equipamentoModelo} (S/N: ${os.equipamentoSerial||'N/A'})</p>
                <p class="mb-1"><strong>Probl:</strong> ${os.problemaDescricao.substring(0,100)}${os.problemaDescricao.length > 100 ? '...' : ''}</p>
                <small class="text-muted">Abertura: ${new Date(os.dataAbertura).toLocaleDateString('pt-BR')} | Orçam. Cliente: ${formatCurrency(os.valorOrcamento)}</small>
                <div class="mt-2">
                    <button class="btn btn-sm btn-warning-custom me-1" onclick="window.editOS(${os.id})"><i class="fas fa-edit me-1"></i> Editar</button>
                    <button class="btn btn-sm btn-info-custom me-1" onclick="window.generateAndOpenOSPdf(${os.id})"><i class="fas fa-file-pdf me-1"></i> PDF Cliente</button>
                    <button class="btn btn-sm btn-success-custom me-1" onclick="window.generateAndOpenOSWhatsAppMessage(${os.id})"><i class="fab fa-whatsapp me-1"></i> Wpp Cliente</button>
                    <button class="btn btn-sm btn-outline-info-custom me-1" onclick="window.abrirModalSelecaoServicoTecnico(${os.id}, 'pdf')"><i class="fas fa-receipt me-1"></i> Recibo Téc.</button>
                    <button class="btn btn-sm btn-outline-success-custom me-1" onclick="window.abrirModalSelecaoServicoTecnico(${os.id}, 'whatsapp')"><i class="fab fa-whatsapp me-1"></i> Wpp Téc.</button>
                    <button class="btn btn-sm btn-danger-custom" onclick="window.deleteOS(${os.id})"><i class="fas fa-trash me-1"></i> Excluir</button>
                </div></div>`;
    });
}
function renderDashboardOSRecentes() {
    const container = document.getElementById('dashboard-os-recentes');
    if (!container) { console.warn("Container dashboard-os-recentes não encontrado."); return; }
    container.innerHTML = '';
    const recentes = ORDENS_SERVICO
        .filter(os => os.status && os.status !== 'Entregue' && os.status !== 'Cancelada' && os.status !== 'Orçamento Reprovado')
        .sort((a,b) => new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime())
        .slice(0, 3); 

    if (recentes.length === 0) { container.innerHTML = '<p class="text-muted">Nenhuma OS ativa recente.</p>'; return; }
    recentes.forEach(os => {
        const cliente = CLIENTES.find(c => c.id === os.clienteId) || { nome: 'N/A' };
        const item = document.createElement('a'); item.href = "#";
        item.className = "list-group-item list-group-item-action bg-dark-tertiary text-white d-flex justify-content-between align-items-center";
        item.onclick = (e) => { e.preventDefault(); navigateToSection('os'); setTimeout(() => window.editOS(os.id), 100); };
        item.innerHTML = `<span>OS #${String(os.id).padStart(3, '0')} - ${cliente.nome} (${os.equipamentoTipo})</span> <span class="${getStatusBadgeClass(os.status)}">${os.status}</span>`;
        container.appendChild(item);
    });
}
window.editOS = function(id) {
    const os = ORDENS_SERVICO.find(item => item.id === id);
    if (os) {
        try {
            const form = document.getElementById('formNovaOS'); 
            if(form) form.reset(); else { console.error("formNovaOS não encontrado em editOS"); return; }
            const el = (idForm) => document.getElementById(idForm); 
            el('os-id').value = os.id; el('os-cliente-select').value = os.clienteId;
            el('os-status').value = os.status; el('os-equip-tipo').value = os.equipamentoTipo;
            el('os-equip-marca').value = os.equipamentoMarca; el('os-equip-modelo').value = os.equipamentoModelo;
            el('os-equip-serial').value = os.equipamentoSerial || ''; el('os-problema').value = os.problemaDescricao;
            el('os-diagnostico-tecnico').value = os.diagnosticoTecnico || '';
            el('os-acessorios-inclusos').value = os.acessoriosInclusos || '';
            el('os-observacoes').value = os.observacoes || ''; 
            el('os-orcamento').value = os.valorOrcamento;
            // O campo os-custo-tecnico foi removido do formulário da OS.
            const osImagensEl = el('os-imagens'); if(osImagensEl) osImagensEl.value = '';
            updateTermoGarantiaPreview();
            const modalEl = el('modalNovaOS'); 
            if(modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show(); else console.error("ModalNovaOS não encontrado.");
             // Mudar título do modal para Edição
            const modalTitle = document.getElementById('modalNovaOSLabelDynamic');
            if (modalTitle) modalTitle.textContent = `Editando OS #${String(os.id).padStart(3,'0')}`;

        } catch(e) { console.error("Erro em editOS:", e); showToast("Erro ao abrir edição de OS.", "danger");}
    } else { showToast("OS não encontrada.", "warning"); }
};
window.deleteOS = function(id) { if (confirm("Excluir esta OS?")) { ORDENS_SERVICO = ORDENS_SERVICO.filter(os => os.id !== id); saveOrdensServico(); showToast("OS excluída.", "success"); }};
window.generateAndOpenOSPdf = async function(osId) {
    if (!jsPDFModule) { showToast("Biblioteca PDF (jsPDF) não está carregada.", "danger"); console.error("jsPDFModule is not defined!"); return; }
    const osData = ORDENS_SERVICO.find(os => os.id === osId);
    if (!osData) { showToast("OS não encontrada!", "danger"); return; }
    const cliente = CLIENTES.find(c => c.id === osData.clienteId);
    if (!cliente) { showToast("Cliente da OS não encontrado!", "danger"); return; }
    showToast("Gerando PDF da OS para Cliente...", "info");
    try {
        const doc = new jsPDFModule(); 
        let currentY = 15;
        const addText = (text, x, y, options = {}) => { doc.text(text || '', x, y, options); const dims = doc.getTextDimensions(text || '', options); return y + dims.h + 1; }; // Adicionado +1 para espaçamento
        const addWrappedText = (text, x, y, maxWidth, options = {}) => { const lines = doc.splitTextToSize(text || '', maxWidth); doc.text(lines, x, y, options); const dims = doc.getTextDimensions(lines.join('\n'), options); return y + dims.h + 1;}; // Adicionado +1
        
        if (STORE_CONFIG.logoUrl && STORE_CONFIG.logoUrl.trim() !== "") {
            try { 
                if (STORE_CONFIG.logoUrl.startsWith('data:image')) { 
                     doc.addImage(STORE_CONFIG.logoUrl, 'PNG', 15, currentY, 30, 30, undefined, 'FAST');
                } else { 
                    const img = new Image(); img.crossOrigin = "Anonymous"; 
                    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = (e) => {console.error("Erro ao carregar imagem do logo para PDF OS:", e); reject(e);}; img.src = STORE_CONFIG.logoUrl; });
                    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
                    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    doc.addImage(dataUrl, 'PNG', 15, currentY, 30, 30, undefined, 'FAST');
                }
            } catch (e) { console.error("Falha ao adicionar logo ao PDF da OS:", e); doc.text("Logo Indisponível", 15, currentY + 15); }
        } else { doc.text("Sem Logo", 15, currentY + 15); }
        currentY = Math.max(currentY, 15) + 30 + 5; 

        doc.setFontSize(16); doc.setFont("helvetica", "bold"); 
        let tempY = addText(STORE_CONFIG.nomeLoja || 'Nome da Loja', 60, 20); 
        currentY = Math.max(currentY, tempY); 
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        currentY = addText(STORE_CONFIG.endereco || '', 60, currentY);
        currentY = addText(`CNPJ: ${STORE_CONFIG.cnpj || ''} | Tel/WhatsApp: ${STORE_CONFIG.telefone || ''}`, 60, currentY);
        currentY = addText(`Email: ${STORE_CONFIG.email || ''}`, 60, currentY) + 5;

        doc.setFontSize(18); doc.setFont("helvetica", "bold");
        doc.text(`Ordem de Serviço #${String(osData.id).padStart(4, '0')}`, doc.internal.pageSize.width / 2, currentY, { align: 'center' });
        currentY += 10;
        
        const osDetails = [
            ["Data Abertura:", new Date(osData.dataAbertura).toLocaleString('pt-BR'), "Status Atual:", osData.status || 'N/A'],
            ["Cliente:", cliente.nome, "Telefone:", cliente.telefone || 'N/A'],
            ["Email Cliente:", cliente.email || 'N/A', "CPF Cliente:", cliente.cpf || 'N/A'],
            [{content: `Endereço Cliente: ${cliente.endereco || 'N/A'}`, colSpan: 4}]
        ];
        doc.autoTable({ startY: currentY, head: [[{content: 'Detalhes da OS e Cliente', colSpan: 4, styles: {fillColor: [52,73,94],textColor:255,fontStyle:'bold'}}]], body: osDetails, theme: 'striped', styles: {fontSize:9,cellPadding:1.5}, columnStyles: {0:{fontStyle:'bold',cellWidth:35},2:{fontStyle:'bold',cellWidth:35}}});
        currentY = doc.lastAutoTable.finalY + 7;
        
        const equipmentDetailsBody = [
            ["Tipo:", osData.equipamentoTipo, "Marca:", osData.equipamentoMarca],
            ["Modelo:", osData.equipamentoModelo, "Nº de Série:", osData.equipamentoSerial || "N/A"],
            [{content: "Acessórios Inclusos / Estado:", colSpan: 4, styles: {fontStyle:'bold'}}],
            [{content: osData.acessoriosInclusos || "Nenhum acessório ou observação de estado.", colSpan: 4}]
        ];
        doc.autoTable({ startY: currentY, head: [[{content: 'Informações do Equipamento', colSpan: 4, styles: {fillColor: [52,73,94],textColor:255,fontStyle:'bold'}}]], body: equipmentDetailsBody, theme: 'striped', styles: {fontSize:9,cellPadding:1.5}, columnStyles: {0:{fontStyle:'bold',cellWidth:35},2:{fontStyle:'bold',cellWidth:35}}});
        currentY = doc.lastAutoTable.finalY + 7;

        doc.setFontSize(11); doc.setFont("helvetica", "bold"); currentY = addText("Problema Relatado pelo Cliente:", 15, currentY);
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); currentY = addWrappedText(osData.problemaDescricao, 15, currentY, 180) + 5;
        if(osData.diagnosticoTecnico) { doc.setFontSize(11); doc.setFont("helvetica", "bold"); currentY = addText("Diagnóstico Técnico:", 15, currentY); doc.setFontSize(9); doc.setFont("helvetica", "normal"); currentY = addWrappedText(osData.diagnosticoTecnico, 15, currentY, 180) + 5; }
        if(osData.observacoes){ doc.setFontSize(11); doc.setFont("helvetica", "bold"); currentY = addText("Observações Adicionais / Solução Aplicada:", 15, currentY); doc.setFontSize(9); doc.setFont("helvetica", "normal"); currentY = addWrappedText(osData.observacoes, 15, currentY, 180) + 5; }
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); currentY = addText(`Valor do Orçamento (Cliente): ${formatCurrency(osData.valorOrcamento)}`, 15, currentY) + 10;
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); currentY = addText("Termos de Garantia (Cliente):", 15, currentY);
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); 
        const termosGarantiaCliente = `Garantia de ${STORE_CONFIG.diasGarantiaPadrao} dias após a data de entrega do equipamento reparado, cobrindo apenas o defeito reparado e/ou peças substituídas conforme esta OS. A garantia não cobre danos por mau uso, quedas, líquidos, surtos elétricos, violação do lacre (se aplicável) ou problemas não relacionados ao reparo original. Equipamentos não retirados em até 90 (noventa) dias após a comunicação de conclusão serão considerados abandonados e poderão ser descartados ou reaproveitados para cobrir custos, conforme política da loja e legislação vigente.`;
        currentY = addWrappedText(termosGarantiaCliente, 15, currentY, 180) + 15;
        
        const pageHeight = doc.internal.pageSize.height; 
        let assinaturaY = pageHeight - 40;
        if (currentY > assinaturaY - 10) { doc.addPage(); currentY = 20; assinaturaY = pageHeight - 40; } 
        else { currentY = assinaturaY; }
        doc.line(20, currentY, 90, currentY); addText("Assinatura do Cliente", 35, currentY + 5);
        doc.line(120, currentY, 190, currentY); addText(STORE_CONFIG.nomeLoja, 135, currentY + 5);
        const dataEmissao = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
        doc.setFontSize(8); doc.text(dataEmissao, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
        doc.save(`OS_Cliente_${String(osData.id).padStart(4, '0')}_${cliente.nome.replace(/\s+/g, '_')}.pdf`);
        showToast("PDF da OS (Cliente) gerado!", "success");
    } catch (e) { console.error("Erro ao gerar PDF da OS:", e); showToast("Falha ao gerar PDF da OS. Verifique o console.", "danger"); }
};
window.generateAndOpenOSWhatsAppMessage = function(osId) {
    const osData = ORDENS_SERVICO.find(os => os.id === osId);
    if (!osData) { showToast("OS não encontrada!", "danger"); return; }
    const cliente = CLIENTES.find(c => c.id === osData.clienteId);
    if (!cliente || !cliente.telefone) { showToast("Cliente ou telefone não encontrado para esta OS!", "warning"); return; }
    let mensagem = `Olá, ${cliente.nome}! 👋\n\nEsta é uma mensagem da *${STORE_CONFIG.nomeLoja}* sobre sua Ordem de Serviço *#${String(osData.id).padStart(4, '0')}*.\n\n`;
    mensagem += `*Equipamento:* ${osData.equipamentoTipo || ''} ${osData.equipamentoMarca || ''} ${osData.equipamentoModelo || ''}\n*Problema Relatado:* ${osData.problemaDescricao || ''}\n*Status Atual:* ${osData.status || 'N/A'}\n`;
    if (osData.status === "Concluída - Aguardando Retirada") mensagem += `\nSeu equipamento está pronto para retirada! ✅\nValor final: ${formatCurrency(osData.valorOrcamento)}\n`;
    else if (osData.status === "Aguardando Aprovação") mensagem += `\nO orçamento para o reparo é de ${formatCurrency(osData.valorOrcamento)}. Aguardamos sua aprovação. 👍\n`;
    else if (osData.status === "Aberta" || osData.status === "Em Análise") mensagem += `\nSeu equipamento está em análise. Em breve mais informações. 👨‍🔧\n`;
    mensagem += `\nPara dúvidas, responda esta mensagem ou contate:\nTel/WhatsApp: ${STORE_CONFIG.telefone}\nEmail: ${STORE_CONFIG.email}\n\n`;
    mensagem += `Obrigado! 😊\n${STORE_CONFIG.nomeLoja}\n\nSiga-nos: @luckhousegames\nVisite: www.luckhousegames.com.br`;
    const cleanTelefone = cliente.telefone.replace(/\D/g, '');
    const whatsappNumber = cleanTelefone.startsWith('55') ? cleanTelefone : `55${cleanTelefone}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
    showToast("Mensagem para WhatsApp pronta!", "info");
};

// --- Funções e Modal para Ações do Técnico ---
function setupModalServicoTecnico() {
    const btnConfirmar = document.getElementById('btn-confirmar-servico-tecnico');
    if(btnConfirmar) {
        btnConfirmar.addEventListener('click', function() {
            const osIdHiddenEl = document.getElementById('hidden-os-id-para-tecnico');
            const acaoHiddenEl = document.getElementById('hidden-acao-tecnico');
            const servicoSelectEl = document.getElementById('select-servico-tecnico');

            if (!osIdHiddenEl || !acaoHiddenEl || !servicoSelectEl) {
                console.error("Elementos do modal de seleção de serviço não encontrados.");
                showToast("Erro interno no modal de serviço.", "danger");
                return;
            }

            const osId = parseInt(osIdHiddenEl.value);
            const acao = acaoHiddenEl.value;
            const servicoId = servicoSelectEl.value;

            if (!servicoId) { showToast("Por favor, selecione um serviço realizado.", "warning"); return; }
            
            const osData = ORDENS_SERVICO.find(os => os.id === osId);
            const servicoSelecionado = SERVICOS.find(s => s.id === parseInt(servicoId));

            if (!osData || !servicoSelecionado) { showToast("Erro ao encontrar OS ou Serviço selecionado.", "danger"); return; }

            if (acao === 'whatsapp') {
                enviarMsgWhatsappTecnicoComServico(osData, servicoSelecionado);
            } else if (acao === 'pdf') {
                gerarReciboServicoTecnicoPdfComServico(osData, servicoSelecionado);
            }
            const modalEl = document.getElementById('modalSelecionarServicoParaTecnico');
            if(modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        });
    } else { console.error("Botão de confirmar serviço técnico não encontrado.");}
}

window.abrirModalSelecaoServicoTecnico = function(osId, acao) { 
    const osData = ORDENS_SERVICO.find(os => os.id === osId);
    if (!osData) { showToast("OS não encontrada.", "danger"); return; }

    const osIdHiddenEl = document.getElementById('hidden-os-id-para-tecnico');
    const acaoHiddenEl = document.getElementById('hidden-acao-tecnico');
    const osIdDisplayEl = document.getElementById('modal-os-id-display');
    const selectServicoEl = document.getElementById('select-servico-tecnico');

    if(osIdHiddenEl) osIdHiddenEl.value = osId;
    if(acaoHiddenEl) acaoHiddenEl.value = acao; 
    if(osIdDisplayEl) osIdDisplayEl.textContent = `#${String(osId).padStart(3,'0')}`;

    if(selectServicoEl) {
        selectServicoEl.innerHTML = '<option value="">Selecione um serviço...</option>';
        SERVICOS.forEach(serv => {
            selectServicoEl.innerHTML += `<option value="${serv.id}">${serv.nome} (Custo: ${formatCurrency(serv.custoTecnico)})</option>`;
        });
    } else { console.error("Select de serviço técnico não encontrado."); return; }

    const modalEl = document.getElementById('modalSelecionarServicoParaTecnico');
    if(modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    else { console.error("Modal de seleção de serviço técnico não encontrado."); }
}

function enviarMsgWhatsappTecnicoComServico(osData, servicoInfo) {
    if (!STORE_CONFIG.tecnicoWhatsapp || STORE_CONFIG.tecnicoWhatsapp.trim() === "") {
        showToast("WhatsApp do técnico não configurado.", "warning"); return;
    }
    const cliente = CLIENTES.find(c => c.id === osData.clienteId) || {nome: "N/A"};
    let mensagem = `Nova OS #${String(osData.id).padStart(3,'0')} para Luckhouse Games (Técnico: Luiz Carlos S Sales)!\n\n`;
    mensagem += `Cliente: ${cliente.nome}\n`;
    mensagem += `Data Entrada: ${new Date(osData.dataAbertura).toLocaleDateString('pt-BR')}\n`;
    mensagem += `Equipamento: ${osData.equipamentoTipo || ''} ${osData.equipamentoMarca || ''} - ${osData.equipamentoModelo || ''}\n`;
    if(osData.equipamentoSerial) mensagem += `Serial: ${osData.equipamentoSerial}\n`;
    mensagem += `Defeito Relatado: ${osData.problemaDescricao || ''}\n\n`;
    mensagem += `Serviço a ser realizado: *${servicoInfo.nome}*\n`;
    mensagem += `Valor a ser pago (Custo): *${formatCurrency(servicoInfo.custoTecnico || 0)}*\n\n`;
    mensagem += `Favor confirmar e agendar o reparo.\n\n`;
    mensagem += `${STORE_CONFIG.nomeLoja}\nInstagram: @luckhousegames\nSite: www.luckhousegames.com.br`;
    
    const whatsappNumber = STORE_CONFIG.tecnicoWhatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
    showToast("Mensagem para WhatsApp do Técnico pronta!", "info");
}

function gerarReciboServicoTecnicoPdfComServico(osData, servicoInfo) {
    if (!jsPDFModule) { showToast("Biblioteca PDF (jsPDF) não está carregada.", "danger"); return; }
     const custoTecnicoVal = parseFloat(servicoInfo.custoTecnico);
    if (isNaN(custoTecnicoVal) || custoTecnicoVal < 0) { 
        showToast("Custo do técnico para o serviço selecionado é inválido.", "warning"); return;
    }
    const cliente = CLIENTES.find(c => c.id === osData.clienteId) || {nome: "N/A"};
    showToast("Gerando Recibo do Técnico...", "info");
    try {
        const doc = new jsPDFModule();
        let y = 15;
        const addText = (text, x, yPos, options = {}) => { 
            const strText = String(text === undefined || text === null ? '' : text); 
            doc.text(strText, x, yPos, options); 
            const dims = doc.getTextDimensions(strText, options); 
            return yPos + dims.h + 2; 
        };
        
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); y = addText("Recibo de Prestação de Serviço Técnico", doc.internal.pageSize.width / 2, y, { align: 'center' }) + 5;
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        y = addText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 15, y) + 3;
        y = addText(`Para: ${STORE_CONFIG.nomeLoja || 'Contratante'}`, 15, y);
        y = addText(`De: Luiz Carlos S Sales (Técnico)`, 15, y) + 5;
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); y = addText("Detalhes do Serviço Prestado:", 15, y);
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        y = addText(`Referente à Ordem de Serviço (OS): #${String(osData.id).padStart(3,'0')}`, 15, y);
        y = addText(`Cliente da OS: ${cliente.nome || 'N/A'}`, 15, y);
        y = addText(`Equipamento: ${osData.equipamentoTipo || ''} ${osData.equipamentoMarca || ''} ${osData.equipamentoModelo || ''}`, 15, y);
        y = addText(`Serviço Específico Realizado: ${servicoInfo.nome}`, 15, y) + 5; 
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        y = addText(`Valor Recebido (Custo do Serviço): ${formatCurrency(servicoInfo.custoTecnico)}`, 15, y) + 15; 
        
        let assinaturaY = doc.internal.pageSize.height - 50; 
        if (y > assinaturaY -10) { doc.addPage(); y = 20; assinaturaY = doc.internal.pageSize.height - 50;}
        else { y = assinaturaY; }
        doc.line(20, y, 90, y); addText("Assinatura do Técnico (Luiz Carlos S Sales)", 20, y + 5);
        doc.line(120, y, 190, y); addText(STORE_CONFIG.nomeLoja || 'Contratante', 130, y + 5);
        
        doc.save(`Recibo_Tecnico_OS_${String(osData.id).padStart(3,'0')}.pdf`);
        showToast("Recibo do Técnico gerado!", "success");
    } catch(e) { console.error("Erro ao gerar Recibo do Técnico:", e); showToast("Falha ao gerar Recibo do Técnico.", "danger"); }
}

// --- PDV MODULE ---
function setupPdvModule() {
    const el = id => document.getElementById(id);
    const btnSearch = el('btn-pdv-search-item'); if(btnSearch) btnSearch.addEventListener('click', window.searchPdvItems);
    const discountInput = el('pdv-discount-percentage'); if(discountInput) discountInput.addEventListener('input', updatePdvTotals);
    const btnFinalize = el('btn-finalize-sale'); if(btnFinalize) btnFinalize.addEventListener('click', finalizeSale);
    const btnPrint = el('btn-print-sale-receipt'); if(btnPrint) btnPrint.addEventListener('click', () => printSaleReceipt(true));
    const btnDownloadCoupon = el('btn-download-sale-coupon'); if(btnDownloadCoupon) btnDownloadCoupon.addEventListener('click', () => downloadSaleCouponPdf(true));
    const btnPdvNovoCliente = el('btn-pdv-novo-cliente-rapido');
    if (btnPdvNovoCliente) {
        btnPdvNovoCliente.addEventListener('click', function() {
            window.clientFromPdvFlag = true; 
            const modalNovoCliente = el('modalNovoCliente');
            if (modalNovoCliente) bootstrap.Modal.getOrCreateInstance(modalNovoCliente).show();
            else console.error("Modal de Novo Cliente não encontrado para PDV.")
        });
    }
    
    const formNovoItemRapido = el('formNovoItemRapidoPDV');
    const itemTipoSelect = el('item-rapido-tipo');
    const itemEstoqueGroup = el('item-rapido-estoque-group');
    if (itemTipoSelect && itemEstoqueGroup) { itemTipoSelect.addEventListener('change', function() { itemEstoqueGroup.style.display = this.value === 'produto' ? 'block' : 'none'; }); }
    const modalNovoItemRapidoEl = el('modalNovoItemRapidoPDV');
    if (modalNovoItemRapidoEl && itemTipoSelect && itemEstoqueGroup) { modalNovoItemRapidoEl.addEventListener('show.bs.modal', function() { itemEstoqueGroup.style.display = itemTipoSelect.value === 'produto' ? 'block' : 'none'; }); }
    if(formNovoItemRapido){
        formNovoItemRapido.addEventListener('submit', function(e){
            e.preventDefault();
            const nome = el('item-rapido-nome').value; const precoInput = el('item-rapido-preco').value;
            const tipo = el('item-rapido-tipo').value; const estoqueInput = el('item-rapido-estoque').value;
            if (!nome || !precoInput) { showToast("Nome e Preço são obrigatórios.", "warning"); return; }
            const preco = parseFloat(precoInput);
            if (isNaN(preco) || preco <= 0) { showToast("Preço inválido.", "warning"); return; }
            const estoque = tipo === 'produto' ? parseInt(estoqueInput) || 0 : undefined;
            let novoItemSalvo;
            if (tipo === 'produto') { novoItemSalvo = { id: getNextId(PRODUTOS), nome, precoVenda: preco, estoque, categoria: 'PDV Rápido', tipo: 'produto', isVideogame: false }; PRODUTOS.push(novoItemSalvo); saveProdutos(); } 
            else { novoItemSalvo = { id: getNextId(SERVICOS), nome, valor: preco, descricao: 'Serviço PDV', tipo: 'servico', custoTecnico: 0 }; SERVICOS.push(novoItemSalvo); saveServicos(); }
            showToast(`Item "${nome}" adicionado ao cadastro!`, 'success');
            window.pdvAddItemByIdAndType(novoItemSalvo.id, novoItemSalvo.tipo);
            bootstrap.Modal.getInstance(el('modalNovoItemRapidoPDV'))?.hide();
            formNovoItemRapido.reset(); 
            if(itemEstoqueGroup) itemEstoqueGroup.style.display = 'block'; if(itemTipoSelect) itemTipoSelect.value = 'produto';
        });
    } else { console.error("Formulário formNovoItemRapidoPDV não encontrado."); }
    const pdvClienteSelectEl = el('pdv-cliente-select');
    if(pdvClienteSelectEl) pdvClienteSelectEl.addEventListener('change', fillPdvClientReceiptFields);
}
function loadVendas() { VENDAS = loadData('luckhouse_vendas', []); }
function renderPdvItemList(searchTerm = '') {
    const listEl = document.getElementById('pdv-item-list'); if(!listEl) {console.error("Elemento pdv-item-list não encontrado."); return;}
    listEl.innerHTML = ''; const combined = [...PRODUTOS, ...SERVICOS];
    const term = searchTerm.toLowerCase();
    const filtered = combined.filter(item => item.nome.toLowerCase().includes(term) || (item.categoria && item.categoria.toLowerCase().includes(term)));
    if (filtered.length === 0) { listEl.innerHTML = `<p class="text-muted p-2">${searchTerm ? 'Nenhum item encontrado.' : 'Nenhum item cadastrado.'}</p>`; return; }
    filtered.forEach(item => {
        const price = item.tipo === 'produto' ? item.precoVenda : item.valor;
        listEl.innerHTML += `<a href="#" class="list-group-item list-group-item-action bg-dark-tertiary text-white" onclick="window.pdvAddItemByIdAndType(${item.id}, '${item.tipo}')">${item.nome} - ${formatCurrency(price)}</a>`;
    });
}
window.searchPdvItems = function() { const termEl = document.getElementById('pdv-search-item'); if(termEl) { const term = termEl.value; renderPdvItemList(term); } else {console.error("Campo de busca PDV não encontrado.");} };
window.pdvAddItemByIdAndType = function(itemId, itemType) {
    console.log("Tentando adicionar item por ID e Tipo:", itemId, itemType);
    let itemFull = null;
    if (itemType === 'produto') itemFull = PRODUTOS.find(p => p.id === parseInt(itemId));
    else if (itemType === 'servico') itemFull = SERVICOS.find(s => s.id === parseInt(itemId));

    if (!itemFull) { showToast("Item não encontrado no cadastro.", "danger"); console.error("Item não encontrado:", itemId, itemType); return; }
    
    if (itemFull.tipo === 'produto' && (itemFull.estoque === undefined || itemFull.estoque <= 0)) { showToast(`"${itemFull.nome}" fora de estoque!`, "warning"); return; }
    const existing = pdvCartItems.find(ci => ci.id === itemFull.id && ci.tipo === itemFull.tipo);
    if(existing){ if (itemFull.tipo === 'produto' && itemFull.estoque !== undefined && existing.quantidade >= itemFull.estoque) { showToast(`Estoque máximo para "${itemFull.nome}".`, "warning"); return; } existing.quantidade++; } 
    else { pdvCartItems.push({ id: itemFull.id, nome: itemFull.nome, preco: itemFull.tipo === 'produto' ? itemFull.precoVenda : itemFull.valor, quantidade: 1, tipo: itemFull.tipo, estoqueOriginal: itemFull.tipo === 'produto' ? itemFull.estoque : Infinity, isVideogame: itemFull.isVideogame || false }); }
    updatePdvCartUI(); showToast(`${itemFull.nome} adicionado.`, "success");
};
function updatePdvCartUI() {
    const cartUl = document.getElementById('pdv-cart'); if(!cartUl) {console.error("Elemento pdv-cart não encontrado."); return;}
    cartUl.innerHTML = ''; 
    if (pdvCartItems.length === 0) { cartUl.innerHTML = '<li class="list-group-item d-flex justify-content-between align-items-center bg-dark-tertiary text-muted">Nenhum item.</li>'; }
    else { pdvCartItems.forEach((item, i) => { cartUl.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center bg-dark-tertiary text-white"><div>${item.nome} (x${item.quantidade}) <small class="d-block text-muted">${formatCurrency(item.preco)} cada</small></div><span class="d-flex align-items-center">${formatCurrency(item.preco*item.quantidade)}<button class="btn btn-sm btn-outline-light ms-2" onclick="window.pdvDecrementItem(${i})"><i class="fas fa-minus"></i></button><button class="btn btn-sm btn-outline-light ms-1" onclick="window.pdvIncrementItem(${i})"><i class="fas fa-plus"></i></button><button class="btn btn-sm btn-danger-custom ms-2" onclick="window.pdvRemoveItem(${i})"><i class="fas fa-times"></i></button></span></li>`; }); }
    updatePdvTotals();
}
window.pdvIncrementItem = function(index) { const item = pdvCartItems[index]; if (item.tipo === 'produto' && item.estoqueOriginal !== undefined && item.quantidade >= item.estoqueOriginal) { showToast(`Estoque máximo para "${item.nome}".`, "warning"); return; } item.quantidade++; updatePdvCartUI(); };
window.pdvDecrementItem = function(index) { pdvCartItems[index].quantidade--; if(pdvCartItems[index].quantidade <= 0) pdvCartItems.splice(index, 1); updatePdvCartUI(); };
window.pdvRemoveItem = function(index) { const removed = pdvCartItems.splice(index, 1)[0]; updatePdvCartUI(); showToast(`${removed.nome} removido.`, "info"); };
function updatePdvTotals() {
    let subtotal = pdvCartItems.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    document.getElementById('pdv-subtotal').textContent = formatCurrency(subtotal);
    const discPercEl = document.getElementById('pdv-discount-percentage');
    const discPerc = discPercEl ? parseFloat(discPercEl.value) || 0 : 0;
    const discVal = subtotal * (discPerc / 100);
    document.getElementById('pdv-discount-value').textContent = formatCurrency(discVal);
    document.getElementById('pdv-total').textContent = formatCurrency(subtotal - discVal);
}
function fillPdvClientReceiptFields() {
    const clienteId = document.getElementById('pdv-cliente-select').value;
    const nameInput = document.getElementById('pdv-receipt-client-name');
    const contactInput = document.getElementById('pdv-receipt-client-contact');
    if (!nameInput || !contactInput) {console.error("Campos de nome/contato do recibo PDV não encontrados."); return;}

    if (clienteId) {
        const cliente = CLIENTES.find(c => c.id === parseInt(clienteId));
        if (cliente) { nameInput.value = cliente.nome; contactInput.value = cliente.telefone || cliente.email || ''; }
    } else { nameInput.value = ''; contactInput.value = ''; }
}
function finalizeSale() {
    if (pdvCartItems.length === 0) { showToast("Carrinho vazio.", "warning"); return; }
    
    const receiptClientName = document.getElementById('pdv-receipt-client-name').value;
    const receiptClientContact = document.getElementById('pdv-receipt-client-contact').value;
    const clienteIdSelected = document.getElementById('pdv-cliente-select').value;
    let clienteCpfFinal = null;
    if(clienteIdSelected){ const clienteDb = CLIENTES.find(c => c.id === parseInt(clienteIdSelected)); if(clienteDb) clienteCpfFinal = clienteDb.cpf; }

    const totalStr = document.getElementById('pdv-total').textContent;
    const total = parseFloat(totalStr.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
    const venda = {
        id: getNextId(VENDAS), data: new Date().toISOString(), clienteId: clienteIdSelected ? parseInt(clienteIdSelected) : null,
        receiptClientName: receiptClientName, receiptClientContact: receiptClientContact, clienteCpf: clienteCpfFinal, 
        itens: pdvCartItems.map(i => ({ id: i.id, nome: i.nome, precoUnitario: i.preco, quantidade: i.quantidade, subtotal: i.preco * i.quantidade, tipo: i.tipo, isVideogame: i.isVideogame })), 
        subtotal: pdvCartItems.reduce((s,i)=>s+(i.preco*i.quantidade),0),
        descontoPercentual: parseFloat(document.getElementById('pdv-discount-percentage').value) || 0,
        valorDesconto: parseFloat(document.getElementById('pdv-discount-value').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0,
        total: total,
        formaPagamento: document.getElementById('payment-method').value
    };
    VENDAS.push(venda); saveData('luckhouse_vendas', VENDAS);
    pdvCartItems.forEach(ci => { if (ci.tipo === 'produto') { const pOrig = PRODUTOS.find(p => p.id === ci.id); if (pOrig && pOrig.estoque !== undefined) { pOrig.estoque -= ci.quantidade; if (pOrig.estoque < 0) pOrig.estoque = 0; } }});
    saveProdutos(); 
    showToast(`Venda #${venda.id} finalizada! Total: ${formatCurrency(total)}`, "success");
    pdvCartItems = []; updatePdvCartUI(); 
    document.getElementById('pdv-cliente-select').value = ''; 
    document.getElementById('pdv-receipt-client-name').value = '';
    document.getElementById('pdv-receipt-client-contact').value = '';
    document.getElementById('pdv-discount-percentage').value = 0; 
    updatePdvTotals();
}
function prepareReceiptHTML(isPreview = true, saleData = null) {
    let itemsToProcess, clientName, clientContact, clientCpf = null, payment, saleTotal, discountVal, subtotalVal, saleDate, hasVideogame = false;
    if (isPreview && !saleData) { 
        if (pdvCartItems.length === 0) { showToast("Carrinho vazio.", "warning"); return null; }
        itemsToProcess = pdvCartItems.map(i => ({ ...i })); // Copia para não alterar original
        clientName = document.getElementById('pdv-receipt-client-name').value || "Consumidor";
        clientContact = document.getElementById('pdv-receipt-client-contact').value;
        const selectedClientId = document.getElementById('pdv-cliente-select').value;
        if (selectedClientId) { const cliente = CLIENTES.find(c => c.id === parseInt(selectedClientId)); if(cliente) clientCpf = cliente.cpf; } 
        payment = document.getElementById('payment-method').value;
        saleTotal = parseFloat(document.getElementById('pdv-total').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
        discountVal = parseFloat(document.getElementById('pdv-discount-value').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
        subtotalVal = parseFloat(document.getElementById('pdv-subtotal').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
        saleDate = new Date();
        hasVideogame = pdvCartItems.some(item => item.isVideogame);
    } else if (saleData) { 
        itemsToProcess = saleData.itens.map(i => ({...i}));
        clientName = saleData.receiptClientName || "Consumidor"; clientContact = saleData.receiptClientContact; clientCpf = saleData.clienteCpf; 
        payment = saleData.formaPagamento; saleTotal = saleData.total; discountVal = saleData.valorDesconto; 
        subtotalVal = saleData.subtotal; saleDate = new Date(saleData.data);
        hasVideogame = itemsToProcess.some(item => item.isVideogame);
    } else { return null; }
    let html = `<div class="receipt-content">`; 
    html += `<div style="text-align: center;">`;
    if (STORE_CONFIG.logoUrl && (STORE_CONFIG.logoUrl.startsWith('data:image') || STORE_CONFIG.logoUrl.startsWith('assets/'))) { html += `<img src="${STORE_CONFIG.logoUrl}" alt="Logo" class="receipt-logo">`; } 
    else { html += `<h2 style="margin: 2mm 0; font-size: 11pt;">${STORE_CONFIG.nomeLoja.toUpperCase()}</h2>`; }
    html += `<p>${STORE_CONFIG.endereco}</p><p>CNPJ: ${STORE_CONFIG.cnpj}</p><p>Tel: ${STORE_CONFIG.telefone}</p></div><hr>`;
    html += `<h3 style="text-align: center; font-size: 10pt; margin: 1mm 0;">COMPROVANTE DE VENDA</h3>`;
    html += `<p style="text-align: center; font-size: 8pt;">${saleDate.toLocaleString('pt-BR')}</p><hr>`;
    html += `<p>Cliente: ${clientName}</p>`;
    if (clientContact) html += `<p>Contato: ${clientContact}</p>`;
    if (clientCpf) html += `<p>CPF: ${clientCpf}</p>`;
    html += `<table style="width:100%;font-size:8pt;margin-top:2mm"><thead><tr><th style="text-align:left;width:55%">Item</th><th style="text-align:right;width:15%">Qtd</th><th style="text-align:right;width:30%">Total</th></tr></thead><tbody>`;
    itemsToProcess.forEach(item => { html += `<tr><td style="word-break:break-all;">${item.nome}</td><td style="text-align:right;">${item.quantidade}</td><td style="text-align:right;">${formatCurrency(item.precoUnitario * item.quantidade)}</td></tr>`; });
    html += `</tbody></table><hr><div style="font-size:9pt"><p>Subtotal: <span style="float:right;">${formatCurrency(subtotalVal)}</span></p>`;
    if (discountVal > 0) html += `<p>Desconto: <span style="float:right;">-${formatCurrency(discountVal)}</span></p>`;
    html += `<p style="font-weight:bold;">TOTAL: <span style="float:right;">${formatCurrency(saleTotal)}</span></p>`;
    html += `<p>Pagamento: <span style="float:right;">${payment}</span></p></div>`;
    if (hasVideogame) {
        html += `<hr><p style="font-size:7pt; text-align:center;">TERMO DE GARANTIA (VIDEOGAME): Garantia de ${STORE_CONFIG.diasGarantiaPadrao} dias contra defeitos de fabricação. Não cobre mau uso ou danos físicos.</p>`;
    }
    html += `<hr><p style="text-align:center;font-size:8pt;margin-top:3mm">Obrigado!</p><p style="text-align:center;font-size:8pt">${STORE_CONFIG.nomeLoja}</p>`;
    html += `<p style="text-align:center;font-size:7pt;">IG: @luckhousegames | Site: www.luckhousegames.com.br</p></div>`;
    return html;
}
function printSaleReceipt(isPreview = true, saleData = null) {
    console.log("printSaleReceipt chamado. isPreview:", isPreview, "saleData:", saleData);
    const receiptHTML = prepareReceiptHTML(isPreview, saleData);
    if (!receiptHTML) { console.error("HTML do recibo não gerado."); return; }
    const printArea = document.getElementById('receipt-print-area');
    if (!printArea) { showToast("Área de impressão não encontrada.", "danger"); console.error("Elemento receipt-print-area não encontrado."); return; }
    printArea.innerHTML = receiptHTML;
    printArea.classList.remove('d-none'); 
    console.log("HTML do recibo injetado na área de impressão.");
    showToast(isPreview ? "Prévia do recibo pronta para impressão." : "Recibo pronto para impressão.", "info");
    
    setTimeout(() => { 
        try { 
            console.log("Chamando window.print()...");
            window.print(); 
            console.log("window.print() chamado com sucesso.");
        } catch(e) { console.error("Erro ao chamar window.print():", e); showToast("Erro ao tentar imprimir.", "danger");}
        // Não esconder a área de impressão aqui, pois pode interferir no diálogo de impressão.
        // O CSS @media print cuida de mostrar apenas o necessário.
    }, 350); // Aumentado o delay para garantir renderização
}
function downloadSaleCouponPdf(isPreview = true, saleData = null) {
    if (!jsPDFModule) { showToast("Biblioteca PDF (jsPDF) não está carregada.", "danger"); return; }
    let itemsToProcess, clientName, clientCpf, clientContact, payment, saleTotal, discountVal, subtotalVal, saleDate, hasVideogame = false;
    
    if (isPreview && !saleData) { 
        if (pdvCartItems.length === 0) { showToast("Carrinho vazio.", "warning"); return; }
        itemsToProcess = pdvCartItems.map(i => ({ nome: i.nome, precoUnitario: i.preco, quantidade: i.quantidade, subtotal: i.preco * i.quantidade, isVideogame: i.isVideogame }));
        clientName = document.getElementById('pdv-receipt-client-name').value || "Consumidor";
        clientContact = document.getElementById('pdv-receipt-client-contact').value;
        const selectedClientId = document.getElementById('pdv-cliente-select').value;
        if (selectedClientId) { const cliente = CLIENTES.find(c => c.id === parseInt(selectedClientId)); if(cliente) clientCpf = cliente.cpf; } 
        payment = document.getElementById('payment-method').value;
        saleTotal = parseFloat(document.getElementById('pdv-total').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
        discountVal = parseFloat(document.getElementById('pdv-discount-value').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
        subtotalVal = parseFloat(document.getElementById('pdv-subtotal').textContent.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
        saleDate = new Date();
        hasVideogame = pdvCartItems.some(item => item.isVideogame);
    } else if (saleData) { 
        itemsToProcess = saleData.itens.map(i => ({...i}));
        clientName = saleData.receiptClientName || "Consumidor"; clientContact = saleData.receiptClientContact; clientCpf = saleData.clienteCpf; 
        payment = saleData.formaPagamento; saleTotal = saleData.total; discountVal = saleData.valorDesconto; 
        subtotalVal = saleData.subtotal; saleDate = new Date(saleData.data);
        hasVideogame = itemsToProcess.some(item => item.isVideogame);
    } else { return; }

    showToast("Gerando Cupom PDF...", "info");
    try {
        const doc = new jsPDFModule({ unit: 'mm', format: [78, 200] }); 
        let y = 5; const xMargin = 3; const contentWidth = 78 - (2 * xMargin);

        if (STORE_CONFIG.logoUrl && (STORE_CONFIG.logoUrl.startsWith('data:image'))) { // Apenas base64 para PDF simples
            try { doc.addImage(STORE_CONFIG.logoUrl, 'PNG', contentWidth / 2 - 15 + xMargin, y, 30, 10); y += 12; } 
            catch(e){ console.warn("Logo (base64) não adicionado ao cupom PDF",e); doc.setFontSize(8).text("[Logo Indisp.]", contentWidth/2 + xMargin, y, {align:'center'}); y+=5;}
        } else { doc.setFontSize(10).setFont("helvetica", "bold"); doc.text(STORE_CONFIG.nomeLoja.toUpperCase(), contentWidth/2 + xMargin, y, {align:'center'}); y += 4;}
        
        doc.setFontSize(7).setFont("helvetica", "normal");
        let textLines = doc.splitTextToSize(STORE_CONFIG.endereco, contentWidth); doc.text(textLines, contentWidth/2 + xMargin, y, {align:'center'}); y += textLines.length * 2.5 + 1;
        doc.text(`CNPJ: ${STORE_CONFIG.cnpj}`, contentWidth/2 + xMargin, y, {align:'center'}); y+=3;
        doc.text(`Tel: ${STORE_CONFIG.telefone}`, contentWidth/2 + xMargin, y, {align:'center'}); y+=4;
        doc.line(xMargin, y, xMargin + contentWidth, y); y+=3;
        doc.setFontSize(8).setFont("helvetica", "bold"); doc.text("COMPROVANTE DE VENDA", contentWidth/2 + xMargin, y, {align:'center'}); y+=3;
        doc.setFontSize(7).setFont("helvetica", "normal"); doc.text(new Date(saleDate).toLocaleString('pt-BR'), contentWidth/2 + xMargin, y, {align:'center'}); y+=3;
        doc.line(xMargin, y, xMargin + contentWidth, y); y+=3;

        doc.text(`Cliente: ${clientName||'Consumidor'}`, xMargin, y); y+=3;
        if(clientContact) { doc.text(`Contato: ${clientContact}`, xMargin, y); y+=3; }
        if(clientCpf) { doc.text(`CPF: ${clientCpf}`, xMargin, y); y+=3; }
        
        const bodyData = itemsToProcess.map(item => [
            { content: `${item.quantidade}x ${item.nome}`, styles: { cellWidth: contentWidth * 0.65, overflow: 'linebreak' } },
            { content: formatCurrency(item.precoUnitario * item.quantidade), styles: { cellWidth: contentWidth * 0.35, halign: 'right' } }
        ]);
        doc.autoTable({ startY: y, head: [['Item', 'Total']], body: bodyData, theme: 'plain', styles: { fontSize: 7, cellPadding: 0.5, lineWidth: 0.1, lineColor: 180 }, headStyles: { fillColor: [230,230,230], textColor: 0, fontStyle: 'bold', halign: 'center'}, margin: {left: xMargin, right: xMargin}, tableWidth: contentWidth });
        y = doc.lastAutoTable.finalY + 2;
        doc.line(xMargin, y, xMargin + contentWidth, y); y+=3;
        doc.setFontSize(8);
        doc.text("Subtotal:", xMargin, y); doc.text(formatCurrency(subtotalVal), xMargin + contentWidth, y, {align:'right'}); y+=4;
        if(discountVal > 0) { doc.text("Desconto:", xMargin, y); doc.text(`-${formatCurrency(discountVal)}`, xMargin+contentWidth, y, {align:'right'}); y+=4; }
        doc.setFont("helvetica", "bold"); doc.text("TOTAL:", xMargin, y); doc.text(formatCurrency(saleTotal), xMargin+contentWidth, y, {align:'right'}); y+=4;
        doc.setFont("helvetica", "normal"); doc.text(`Pagamento: ${payment}`, xMargin, y);  y+=4;
        doc.line(xMargin, y, xMargin + contentWidth, y); y+=3;
        if (hasVideogame) { doc.setFontSize(6); textLines = doc.splitTextToSize(`GARANTIA (Videogame): ${STORE_CONFIG.diasGarantiaPadrao} dias contra defeitos de fabricação. Não cobre mau uso ou danos físicos.`, contentWidth); doc.text(textLines, contentWidth/2 + xMargin, y, {align:'center'}); y+= textLines.length * 2 +1; }
        doc.setFontSize(7); doc.text("Obrigado pela preferência!", contentWidth/2+xMargin, y, {align:'center'}); y+=3;
        doc.text(STORE_CONFIG.nomeLoja, contentWidth/2+xMargin, y, {align:'center'}); y+=3;
        doc.text(`IG: @luckhousegames | Site: www.luckhousegames.com.br`, contentWidth/2 + xMargin, y, {align:'center'});
        
        doc.save(`Cupom_Venda_${(clientName||'Consumidor').replace(/\s+/g, '_')}_${new Date(saleDate).toISOString().slice(0,10)}.pdf`);
        showToast("Cupom PDF gerado!", "success");
    } catch (e) { console.error("Erro ao gerar Cupom PDF:", e); showToast("Falha ao gerar Cupom PDF.", "danger");}
}

// --- ADMIN AREA ---
function setupAdminAreaModule() {
    const btnExport = document.getElementById('btn-export-vendas-csv');
    if (btnExport) btnExport.addEventListener('click', exportVendasCSV);
    else console.error("Botão btn-export-vendas-csv não encontrado.");
}
function renderAdminDashboard() {
    if (CURRENT_USER.role !== 'admin') return;
    const fatEl = document.getElementById('admin-faturamento-total');
    if (fatEl) fatEl.textContent = formatCurrency(VENDAS.reduce((s,v)=>s+v.total,0));
    renderSalesChart();
}
function renderSalesChart() {
    if (CURRENT_USER.role !== 'admin' || typeof ChartJS === 'undefined') { console.warn("ChartJS não definido ou usuário não admin para renderSalesChart."); return; }
    const canvas = document.getElementById('salesChartCanvas');
    if (!canvas) { console.error("Canvas do gráfico (salesChartCanvas) não encontrado."); return; }
    const ultimasVendas = VENDAS.slice(-10);
    const labels = ultimasVendas.map(v => `V#${v.id} (${new Date(v.data).toLocaleDateString('pt-BR')})`);
    const data = ultimasVendas.map(v => v.total);
    if (salesChartInstance) salesChartInstance.destroy();
    try {
        salesChartInstance = new ChartJS(canvas, { 
            type: 'bar', data: {labels, datasets:[{label:'Valor da Venda (R$)', data, backgroundColor:'rgba(0,123,255,0.5)', borderColor:'rgba(0,123,255,1)', borderWidth:1}]}, 
            options:{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)'} }, x: { ticks: { color: '#fff' }, grid: { display: false } } }, plugins: { legend: { display: true, labels: { color: '#fff' } } } } 
        });
    } catch (e) { console.error("Erro ao criar gráfico:", e); }
}
function exportVendasCSV() {
    if (VENDAS.length === 0) { showToast("Nenhuma venda para exportar.", "info"); return; }
    let csvContent = "ID Venda;Data;Cliente Nome Recibo;Cliente Contato Recibo;Cliente CPF Cadastrado;Itens;Subtotal;Desconto (%);Valor Desconto;Total;Forma Pagamento\n";
    VENDAS.forEach(v => {
        const dataVenda = new Date(v.data).toLocaleString('pt-BR');
        const itensString = v.itens.map(item => `${item.quantidade}x ${item.nome} (${formatCurrency(item.precoUnitario)})`).join(' | ');
        csvContent += `${v.id};"${dataVenda}";"${v.receiptClientName || ''}";"${v.receiptClientContact || ''}";"${v.clienteCpf || ''}";"${itensString}";${v.subtotal.toFixed(2)};${v.descontoPercentual.toFixed(2)};${v.valorDesconto.toFixed(2)};${v.total.toFixed(2)};"${v.formaPagamento}"\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_vendas_luckhouse_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast("Relatório de vendas CSV gerado!", "success");
}

// --- SEARCH/FILTER & BACKUP/RESTORE ---
function setupSearchFilterListeners() {
    const btnSearchProdServ = document.getElementById('btn-search-prodserv');
    if(btnSearchProdServ) btnSearchProdServ.addEventListener('click', filterProductServiceList);
    else console.error("Botão btn-search-prodserv não encontrado.");
}
function setupBackupRestoreModule() {
    const btnExport = document.getElementById('btn-export-data');
    if(btnExport) btnExport.addEventListener('click', exportData);
    const importFileEl = document.getElementById('importFile');
    if(importFileEl) importFileEl.addEventListener('change', importData);
    const btnReset = document.getElementById('btn-reset-data');
    if(btnReset) btnReset.addEventListener('click', resetAllDataWarning);
}
function filterOSList() {
    const searchInput = document.getElementById('searchOSInput');
    if (!searchInput) { console.error("Campo de busca de OS não encontrado."); return; }
    const term = searchInput.value.toLowerCase();
    const filtered = ORDENS_SERVICO.filter(os => {
        const c = CLIENTES.find(cl => cl.id === os.clienteId);
        return String(os.id).includes(term) || 
               (c && c.nome.toLowerCase().includes(term)) ||
               (os.equipamentoTipo && os.equipamentoTipo.toLowerCase().includes(term)) ||
               (os.equipamentoMarca && os.equipamentoMarca.toLowerCase().includes(term)) ||
               (os.equipamentoModelo && os.equipamentoModelo.toLowerCase().includes(term)) ||
               (os.status && os.status.toLowerCase().includes(term));
    });
    renderOSList(filtered);
}
function filterClientList() {
    const searchInput = document.getElementById('searchClientInput');
    if (!searchInput) { console.error("Campo de busca de Cliente não encontrado."); return; }
    const term = searchInput.value.toLowerCase();
    const filtered = CLIENTES.filter(c => 
        c.nome.toLowerCase().includes(term) || 
        (c.telefone && c.telefone.includes(term)) ||
        (c.cpf && c.cpf.includes(term))
    );
    renderClientList(filtered);
}
function filterProductServiceList() {
    const searchInput = document.getElementById('searchProductServiceInput');
    if (!searchInput) { console.error("Campo de busca de Produto/Serviço não encontrado."); return; }
    const term = searchInput.value.toLowerCase();
    const activeTabEl = document.querySelector('#myTab .nav-link.active');
    if(!activeTabEl) { console.error("Aba ativa de Produtos/Serviços não encontrada."); return; }
    const activeTab = activeTabEl.id;

    if (activeTab === 'tab-produtos') {
        renderProductList(PRODUTOS.filter(p => p.nome.toLowerCase().includes(term) || (p.categoria && p.categoria.toLowerCase().includes(term))));
    } else if (activeTab === 'tab-servicos') {
        renderServiceList(SERVICOS.filter(s => s.nome.toLowerCase().includes(term) || (s.descricao && s.descricao.toLowerCase().includes(term))));
    }
}
function exportData() {
    const dataToExport = { config: STORE_CONFIG, clientes: CLIENTES, produtos: PRODUTOS, servicos: SERVICOS, os: ORDENS_SERVICO, vendas: VENDAS };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `luckhouse_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("Dados exportados com sucesso!", "success");
}
function importData(event) {
    const file = event.target.files[0];
    if (file) {
        if (!confirm("IMPORTANTE: Isso substituirá todos os dados atuais. Deseja continuar?")) { event.target.value = null; return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.config && Array.isArray(imported.clientes) && Array.isArray(imported.os) && 
                    Array.isArray(imported.produtos) && Array.isArray(imported.servicos) && Array.isArray(imported.vendas) ) { 
                    STORE_CONFIG = imported.config; CLIENTES = imported.clientes; PRODUTOS = imported.produtos; 
                    SERVICOS = imported.servicos; ORDENS_SERVICO = imported.os; VENDAS = imported.vendas;
                    saveAppConfig(); saveClientes(); saveProdutos(); saveServicos(); saveOrdensServico(); saveData('luckhouse_vendas', VENDAS);
                    loadAllData(); 
                    showToast("Dados importados! A página será recarregada.", "success");
                    setTimeout(() => location.reload(), 1500);
                } else { showToast("Arquivo de backup inválido ou estrutura incorreta.", "danger"); }
            } catch (err) { showToast("Erro ao processar backup: " + err.message, "danger"); console.error(err); } 
            finally { event.target.value = null; }
        };
        reader.readAsText(file);
    }
}
function resetAllDataWarning() {
    if (confirm("ATENÇÃO MÁXIMA!\n\nAPAGAR TODOS OS DADOS?\nEsta ação é IRREVERSÍVEL!\n\nTem certeza ABSOLUTA?")) {
        if (prompt("Para confirmar, digite 'DELETAR TUDO':") === "DELETAR TUDO") {
            localStorage.removeItem('luckhouse_config'); localStorage.removeItem('luckhouse_clientes');
            localStorage.removeItem('luckhouse_produtos'); localStorage.removeItem('luckhouse_servicos');
            localStorage.removeItem('luckhouse_os'); localStorage.removeItem('luckhouse_vendas');
            localStorage.removeItem('luckhouse_currentUser'); 
            showToast("TODOS OS DADOS FORAM APAGADOS! A página será recarregada.", "danger");
            setTimeout(() => location.reload(), 2000);
        } else { showToast("Ação de reset cancelada.", "info"); }
    }
}

// --- INITIALIZATION & NAVIGATION ---
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded. Iniciando Luckhouse Games System...");
    try {
        const el = id => document.getElementById(id);
        const menuToggle = el('menu-toggle'); const wrapper = el('wrapper');
        const currentYearSpan = el('currentYear'); const footerCurrentYearSpan = el('footerCurrentYear');
        const formLoginEl = el('formLogin'); const logoutButtonEl = el('logout-button');
        const cardNovaOSEl = el('card-nova-os');
        
        if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
        if (footerCurrentYearSpan) footerCurrentYearSpan.textContent = new Date().getFullYear();

        console.log("Carregando dados iniciais..."); loadAllData(); console.log("Dados iniciais carregados.");

        if (formLoginEl) formLoginEl.addEventListener('submit', handleLogin); 
        else console.error("Formulário de Login (formLogin) não encontrado!");
        if (logoutButtonEl) logoutButtonEl.addEventListener('click', handleLogout); 
        else console.error("Botão de Logout (logout-button) não encontrado!");
        
        const navLinks = document.querySelectorAll('#sidebar-wrapper .nav-link[data-target]');
        if (navLinks.length > 0) {
            navLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); navigateToSection(this.dataset.target, this); if (wrapper && window.innerWidth<768 && wrapper.classList.contains('toggled')) { wrapper.classList.remove('toggled'); } }); });
        } else { console.error("Links de navegação da Sidebar não encontrados!"); }
        
        document.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', function() { 
                const target = this.dataset.target;
                console.log(`Card do Dashboard clicado! Target: ${target}`);
                if(this.id === 'card-nova-os'){ 
                    const modalNovaOsEl = document.getElementById('modalNovaOS');
                    if(modalNovaOsEl) {
                        console.log("Acionando modal de Nova OS pelo card.");
                        bootstrap.Modal.getOrCreateInstance(modalNovaOsEl).show();
                    } else console.error("Modal de Nova OS não encontrado para ser aberto pelo card.");
                } else if (target) {
                    navigateToSection(target); 
                }
            });
        });

        if (menuToggle && wrapper) { menuToggle.addEventListener('click', function() { wrapper.classList.toggle('toggled'); }); }
        else { console.warn("Menu toggle ou wrapper não encontrado."); }
        
        console.log("Verificando estado de login inicial...");
        checkLoginState(); 
        
        ['modalNovaOS', 'modalNovoCliente', 'modalNovoProduto', 'modalNovoServico', 'modalNovoItemRapidoPDV', 'modalSelecionarServicoParaTecnico'].forEach(modalId => {
            const modalEl = el(modalId);
            if (modalEl) {
                modalEl.addEventListener('hidden.bs.modal', function () { 
                    console.log(`Modal ${modalId} escondido, resetando formulário.`);
                    const form = this.querySelector('form'); if (form) form.reset(); 
                    const idInput = form ? form.querySelector('input[type="hidden"]') : null; if (idInput) idInput.value = '';
                    if(modalId === 'modalNovaOS') updateTermoGarantiaPreview();
                    if(modalId === 'modalNovoItemRapidoPDV') { const itemEstoqueGroupEl = el('item-rapido-estoque-group'); const itemTipoSelectEl = el('item-rapido-tipo'); if (itemEstoqueGroupEl) itemEstoqueGroupEl.style.display = 'block'; if (itemTipoSelectEl) itemTipoSelectEl.value = 'produto'; }
                });
                if (modalId === 'modalNovaOS') { 
                    modalEl.addEventListener('show.bs.modal', function (event) { 
                        console.log(`Modal ${modalId} sendo exibido.`);
                        const modalTitle = document.getElementById('modalNovaOSLabelDynamic');
                        if(modalTitle) modalTitle.textContent = 'Nova Ordem de Serviço'; // Reset title
                        updateTermoGarantiaPreview(); 
                        populateClienteSelect(); 
                        const btn = event.relatedTarget; 
                        if (btn && (btn.id === "btn-nova-os-modal" || btn.id === "card-nova-os")) { 
                            const form = el('formNovaOS'); if(form) form.reset(); 
                            const osIdInput = el('os-id'); if(osIdInput) osIdInput.value = ''; 
                            console.log("Modal de Nova OS aberto para nova entrada.");
                        } 
                    }); 
                }
                 if (modalId === 'modalNovoCliente') { 
                    modalEl.addEventListener('show.bs.modal', function (event) {
                        const modalTitle = document.getElementById('modalNovoClienteLabelDynamic');
                        if(modalTitle) modalTitle.textContent = 'Novo Cliente';
                    });
                }
                 if (modalId === 'modalNovoProduto') { 
                    modalEl.addEventListener('show.bs.modal', function (event) {
                        const modalTitle = document.getElementById('modalNovoProdutoLabelDynamic');
                        if(modalTitle) modalTitle.textContent = 'Novo Produto';
                    });
                }
                 if (modalId === 'modalNovoServico') { 
                    modalEl.addEventListener('show.bs.modal', function (event) {
                        const modalTitle = document.getElementById('modalNovoServicoLabelDynamic');
                        if(modalTitle) modalTitle.textContent = 'Novo Serviço';
                    });
                }
                if (modalId === 'modalNovoItemRapidoPDV') { 
                    modalEl.addEventListener('show.bs.modal', function() { 
                        console.log(`Modal ${modalId} sendo exibido.`);
                        const itemEstoqueGroupEl = el('item-rapido-estoque-group'); 
                        const itemTipoSelectEl = el('item-rapido-tipo'); 
                        if (itemEstoqueGroupEl && itemTipoSelectEl) { 
                            itemEstoqueGroupEl.style.display = itemTipoSelectEl.value === 'produto' ? 'block' : 'none'; 
                        } 
                    }); 
                }
            } else { console.warn(`Modal com ID ${modalId} não encontrado para configurar listeners.`); }
        });
        console.log("Inicialização do DOM completa e listeners configurados.");
    } catch (error) {
        console.error("ERRO FATAL DURANTE A INICIALIZAÇÃO:", error);
        showToast("Erro crítico na inicialização. Verifique o console (F12).", "danger", "ERRO FATAL");
        const loginPrompt = document.getElementById('login-prompt');
        if (loginPrompt) { loginPrompt.innerHTML = `<h1 class='text-danger display-4'>Erro Crítico na Aplicação</h1><p class='lead'>O sistema encontrou um problema e não pôde ser iniciado corretamente. Por favor, verifique o console do navegador (pressione F12) para detalhes técnicos e, se possível, envie um print do erro para o suporte.</p><p><small>Detalhe: ${error.message}</small></p>`; loginPrompt.classList.remove('d-none'); loginPrompt.style.height = "70vh"; loginPrompt.style.display = "flex"; loginPrompt.style.flexDirection = "column"; loginPrompt.style.justifyContent = "center";}
        document.querySelectorAll('.main-content, .admin-content').forEach(s => s.classList.add('d-none'));
    }
});

function loadAllData() {
    console.groupCollapsed("loadAllData: Carregando todos os dados da aplicação");
    try {
        loadAppConfig(); loadClientes(); loadProdutos(); loadServicos(); loadOrdensServico(); loadVendas();
        renderPdvItemList(); 
        if (CURRENT_USER && CURRENT_USER.role) { renderDashboardOSRecentes(); if (CURRENT_USER.role === 'admin') renderAdminDashboard(); }
    } catch(e) { console.error("Erro Crítico em loadAllData:", e); showToast("Falha crítica ao carregar todos os dados.", "danger");}
    console.groupEnd();
}

function navigateToSection(targetId, clickedLinkElement = null) {
    console.log("navigateToSection: Tentando navegar para:", targetId);
    if (!CURRENT_USER || !CURRENT_USER.role) { 
        if(targetId !== 'login-prompt' && targetId !== 'dashboard') { 
            console.warn("navigateToSection: Tentativa de navegação sem usuário logado para:", targetId, ". Forçando verificação de login.");
            checkLoginState(); return;
        }
    }
    if (targetId === 'admin-area' && (!CURRENT_USER || CURRENT_USER.role !== 'admin')) {
        showToast("Acesso negado. Área restrita a administradores.", "danger");
        console.warn("navigateToSection: Acesso negado à área admin para usuário:", CURRENT_USER.role);
        navigateToSection('dashboard'); return;
    }

    const navLinks = document.querySelectorAll('#sidebar-wrapper .nav-link[data-target]');
    const contentSections = document.querySelectorAll('.content-section');
    navLinks.forEach(l => l.classList.remove('active'));
    contentSections.forEach(s => { if (s.id !== 'login-prompt') s.classList.add('d-none'); }); 

    let activeLink = clickedLinkElement;
    if (!activeLink && targetId !== 'login-prompt') { 
        activeLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
    }
    if(activeLink) activeLink.classList.add('active');
    else if (targetId !== 'login-prompt') console.warn("navigateToSection: Link ativo não encontrado para targetId:", targetId);
    
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.remove('d-none'); 
        console.log("navigateToSection: Seção", targetId, "exibida.");
        if (targetId !== 'login-prompt' && document.getElementById('login-prompt')) {
            document.getElementById('login-prompt').classList.add('d-none');
        }
    } else { 
        console.error("navigateToSection: Seção alvo NÃO encontrada:", targetId, ". Navegando para dashboard como fallback."); 
        const dashboardFallback = document.getElementById('dashboard');
        if (dashboardFallback) dashboardFallback.classList.remove('d-none');
        else if(document.getElementById('login-prompt')) document.getElementById('login-prompt').classList.remove('d-none');
        return; 
    }

    if (CURRENT_USER && CURRENT_USER.role) {
        if(targetId === 'configuracoes') updateStoreInfoUI();
        else if (targetId === 'os') { renderOSList(); populateClienteSelect(); }
        else if (targetId === 'clientes') renderClientList();
        else if (targetId === 'produtos') { renderProductList(); renderServiceList(); }
        else if (targetId === 'pdv'){ renderPdvItemList(); populatePdvClienteSelect(); fillPdvClientReceiptFields(); }
        else if (targetId === 'dashboard') renderDashboardOSRecentes();
        else if (targetId === 'admin-area' && CURRENT_USER.role === 'admin') renderAdminDashboard();
    }
}

console.log("Luckhouse Games - Script.js: Carregamento finalizado e pronto para uso.");