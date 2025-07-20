/**
 * CALCULADORA DE TERCEIRIZAÇÃO - JAVASCRIPT
 */

// VALIDADOR DE FORMULÁRIOS
const FormValidator = {
    // Máscaras
    masks: {
        cnpj: (value) => {
            return value.replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        },
        
        currency: (value) => {
            const numericValue = value.replace(/\D/g, '');
            if (!numericValue) return '';
            const floatValue = parseInt(numericValue) / 100;
            return floatValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            });
        },

        currencyToFloat: (value) => {
            if (!value) return 0;
            const cleaned = value.replace(/[R$\s]/g, '');
            const normalized = cleaned.replace(/\./g, '').replace(',', '.');
            return parseFloat(normalized) || 0;
        }
    },

    // Validações
    validators: {
        required: (value) => value && value.toString().trim().length > 0,
        
        minLength: (value, length) => value && value.length >= length,
        
        maxLength: (value, length) => !value || value.length <= length,
        
        numeric: (value) => {
            if (!value) return false;
            const num = parseFloat(value.toString().replace(/[^\d,.-]/g, '').replace(',', '.'));
            return !isNaN(num) && num > 0;
        },
        
        positiveInteger: (value) => {
            const num = parseInt(value);
            return !isNaN(num) && num > 0 && Number.isInteger(num);
        },

        cnpj: (cnpj) => {
            cnpj = cnpj.replace(/[^\d]+/g, '');
            
            if (cnpj.length !== 14) return false;
            if (/^(\d)\1+$/.test(cnpj)) return false;

            let tamanho = cnpj.length - 2;
            let numeros = cnpj.substring(0, tamanho);
            let digitos = cnpj.substring(tamanho);
            let soma = 0;
            let pos = tamanho - 7;

            for (let i = tamanho; i >= 1; i--) {
                soma += numeros.charAt(tamanho - i) * pos--;
                if (pos < 2) pos = 9;
            }

            let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            if (resultado != digitos.charAt(0)) return false;

            tamanho = tamanho + 1;
            numeros = cnpj.substring(0, tamanho);
            soma = 0;
            pos = tamanho - 7;

            for (let i = tamanho; i >= 1; i--) {
                soma += numeros.charAt(tamanho - i) * pos--;
                if (pos < 2) pos = 9;
            }

            resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
            return resultado == digitos.charAt(1);
        },

        date: (date) => {
            if (!date) return false;
            const dateObj = new Date(date);
            return dateObj instanceof Date && !isNaN(dateObj);
        }
    },

    // Exibir mensagens de validação
    showValidation: (fieldId, isValid, message) => {
        const field = document.getElementById(fieldId);
        const validationDiv = document.getElementById(`${fieldId}-validation`);
        
        if (!field || !validationDiv) return;
        
        field.classList.remove('error', 'success');
        validationDiv.classList.remove('error', 'success');
        validationDiv.style.display = 'none';
        
        // Limpar timeout anterior se existir
        if (validationDiv.timeoutId) {
            clearTimeout(validationDiv.timeoutId);
        }
        
        if (!isValid && message) {
            field.classList.add('error');
            validationDiv.classList.add('error');
            validationDiv.textContent = message;
            validationDiv.style.display = 'block';
            
            // Esconder mensagem após 5 segundos (manter contorno vermelho)
            validationDiv.timeoutId = setTimeout(() => {
                validationDiv.style.display = 'none';
                validationDiv.classList.remove('error');
                // Campo mantém classe 'error' para contorno vermelho
            }, 5000);
            
        } else if (isValid && message) {
            field.classList.add('success');
            validationDiv.classList.add('success');
            validationDiv.textContent = message;
            validationDiv.style.display = 'block';
            
            // Esconder mensagem após 5 segundos (manter contorno verde)
            validationDiv.timeoutId = setTimeout(() => {
                validationDiv.style.display = 'none';
                validationDiv.classList.remove('success');
                // Campo mantém classe 'success' para contorno verde
            }, 5000);
        }
    }
};

// CALCULADORA PRINCIPAL
class CalculadoraTerceirizacao {
    constructor() {
        this.formData = {};
        this.calculations = {};
        this.isInitialized = false;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.init.bind(this));
        } else {
            this.init();
        }
    }

    init() {
        if (this.isInitialized) return;
        
        try {
            this.setupMasks();
            this.setupValidations();
            this.setupEventListeners();
            this.setDefaultValues();
            this.isInitialized = true;
            console.log('✅ Calculadora inicializada!');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    }

    // Configurar máscaras
    setupMasks() {
        const cnpjField = document.getElementById('cnpj');
        const salarioField = document.getElementById('salarioBruto');
        const passagemField = document.getElementById('valorPassagemDiaria');
        const refeicaoField = document.getElementById('auxilioRefeicaoValorDiario');
        const percentualCustosField = document.getElementById('percentualCustosAdicionais');
        const percentualMargemField = document.getElementById('percentualMargemLucro');
        const aliquotaSimplesField = document.getElementById('aliquotaSimplesNacional');

        // Campos de custos adicionais
        const custoFields = [
            document.getElementById('valorCusto1'),
            document.getElementById('valorCusto2'),
            document.getElementById('valorCusto3'),
            document.getElementById('valorCusto4'),
            document.getElementById('valorCusto5')
        ];

        if (cnpjField) {
            cnpjField.addEventListener('input', (e) => {
                e.target.value = FormValidator.masks.cnpj(e.target.value);
            });
        }

        // Aplicar máscara de moeda nos campos monetários
        const monetaryFields = [salarioField, passagemField, refeicaoField, ...custoFields].filter(field => field);
        
        monetaryFields.forEach(field => {
            field.addEventListener('input', (e) => {
                const cleanValue = e.target.value.replace(/[^\d]/g, '');
                if (cleanValue) {
                    e.target.value = FormValidator.masks.currency(cleanValue);
                } else {
                    e.target.value = '';
                }
            });
        });

        // Aplicar máscara de percentual nos campos de percentual
        const percentageFields = [percentualCustosField, percentualMargemField, aliquotaSimplesField].filter(field => field);
        
        percentageFields.forEach(field => {
            let lastValue = '';
            
            field.addEventListener('input', (e) => {
                let value = e.target.value;
                
                // Detectar se o usuário está apagando (valor atual é menor que o anterior)
                const isDeleting = value.length < lastValue.length;
                
                // Se está apagando, permitir e apenas limpar caracteres inválidos
                if (isDeleting) {
                    // Remover % se existir, mas manter o resto
                    value = value.replace('%', '');
                    
                    // Se ficou vazio ou só vírgula, permitir
                    if (value === '' || value === ',') {
                        e.target.value = value;
                        lastValue = value;
                        return;
                    }
                    
                    // Validar se o que sobrou é um número válido
                    const cleanValue = value.replace(',', '.');
                    const numericValue = parseFloat(cleanValue);
                    
                    if (!isNaN(numericValue) && numericValue >= 0) {
                        e.target.value = value;
                    } else {
                        e.target.value = '';
                    }
                    
                    lastValue = e.target.value;
                    return;
                }
                
                // Lógica normal para quando está digitando (não apagando)
                // Remover caracteres inválidos, mantendo apenas números, vírgula e ponto
                value = value.replace(/[^\d,.]/g, '');
                
                // Substituir ponto por vírgula para padronização brasileira
                value = value.replace('.', ',');
                
                // Permitir apenas uma vírgula
                const parts = value.split(',');
                if (parts.length > 2) {
                    value = parts[0] + ',' + parts.slice(1).join('');
                }
                
                // Limitar casas decimais a 2
                if (parts.length === 2 && parts[1].length > 2) {
                    value = parts[0] + ',' + parts[1].substring(0, 2);
                }
                
                // Converter para número para validação
                const numericValue = parseFloat(value.replace(',', '.'));
                
                if (!isNaN(numericValue)) {
                    if (numericValue <= 100) {
                        e.target.value = value + '%';
                    } else {
                        e.target.value = '100%';
                    }
                } else if (value === '' || value === ',') {
                    e.target.value = value;
                } else {
                    e.target.value = '';
                }
                
                lastValue = e.target.value;
            });
            
            // Remover % quando o campo recebe foco para facilitar edição
            field.addEventListener('focus', (e) => {
                let value = e.target.value;
                if (value.endsWith('%')) {
                    e.target.value = value.slice(0, -1);
                }
                lastValue = e.target.value;
            });
            
            // Adicionar % de volta quando perde foco, se necessário
            field.addEventListener('blur', (e) => {
                let value = e.target.value.trim();
                if (value && !value.endsWith('%') && value !== ',') {
                    const numericValue = parseFloat(value.replace(',', '.'));
                    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
                        e.target.value = value + '%';
                    }
                }
                lastValue = e.target.value;
            });
        });
    }

    // Configurar validações
    setupValidations() {
        const validationFields = [
            { id: 'nomeCliente', validator: this.validateNomeCliente.bind(this) },
            { id: 'cnpj', validator: this.validateCNPJ.bind(this) },
            { id: 'responsavelProposta', validator: this.validateResponsavel.bind(this) },
            { id: 'cargo', validator: this.validateCargo.bind(this) },
            { id: 'regimeTributario', validator: this.validateRegimeTributario.bind(this) },
            { id: 'quantidade', validator: this.validateQuantidade.bind(this) },
            { id: 'salarioBruto', validator: this.validateSalario.bind(this) },
            { id: 'dataBase', validator: this.validateDataBase.bind(this) },
            { id: 'valorPassagemDiaria', validator: this.validateValorPassagem.bind(this) },
            { id: 'auxilioRefeicaoValorDiario', validator: this.validateAuxilioRefeicao.bind(this) },
            { id: 'percentualMargemLucro', validator: this.validatePercentualMargemLucro.bind(this) }
        ];

        validationFields.forEach(({ id, validator }) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('blur', validator);
                field.addEventListener('change', validator);
            }
        });
    }

    // Event listeners
    setupEventListeners() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('form-input')) {
                // Limpar contornos coloridos quando usuário começar a digitar
                if (e.target.classList.contains('error') || e.target.classList.contains('success')) {
                    e.target.classList.remove('error', 'success');
                    
                    // Limpar também a mensagem se estiver visível
                    const validationDiv = document.getElementById(`${e.target.id}-validation`);
                    if (validationDiv && validationDiv.timeoutId) {
                        clearTimeout(validationDiv.timeoutId);
                        validationDiv.style.display = 'none';
                        validationDiv.classList.remove('error', 'success');
                    }
                }
                
                this.handleFieldChange(e.target);
            }
        });

        // Event listener específico para regime tributário
        const regimeTributarioField = document.getElementById('regimeTributario');
        if (regimeTributarioField) {
            regimeTributarioField.addEventListener('change', () => {
                // Recalcular tudo quando regime tributário mudar
                const salarioBrutoField = document.getElementById('salarioBruto');
                if (salarioBrutoField && salarioBrutoField.value) {
                    const salarioBruto = FormValidator.masks.currencyToFloat(salarioBrutoField.value);
                    if (salarioBruto > 0) {
                        this.calculateEncargos(salarioBruto);
                    }
                }
                
                // Forçar recálculo dos blocos 7 e 8
                this.calculateResumoFinal();
                this.calculateMargemLucro();
                this.calculateCustosTributos();
                this.calculateResumoFinal();
            });
        }

        // Event listeners específicos para campos que afetam Blocos 7 e 8
        const percentualMargemField = document.getElementById('percentualMargemLucro');
        if (percentualMargemField) {
            percentualMargemField.addEventListener('input', () => {
                // Recalcular blocos 7 e 8 quando margem mudar
                setTimeout(() => {
                    this.calculateResumoFinal();
                    this.calculateMargemLucro();
                    this.calculateCustosTributos();
                    this.calculateResumoFinal();
                }, 100);
            });
        }

        const aliquotaSimplesField = document.getElementById('aliquotaSimplesNacional');
        if (aliquotaSimplesField) {
            aliquotaSimplesField.addEventListener('input', () => {
                // Recalcular tributos quando alíquota mudar
                setTimeout(() => {
                    this.calculateMargemLucro();
                    this.calculateCustosTributos();
                    this.calculateResumoFinal();
                }, 100);
            });
        }

        const percentualCustosField = document.getElementById('percentualCustosAdicionais');
        if (percentualCustosField) {
            percentualCustosField.addEventListener('input', () => {
                // Recalcular bloco 7 quando custos adicionais mudarem
                setTimeout(() => {
                    this.calculateResumoFinal();
                    this.calculateMargemLucro();
                    this.calculateCustosTributos();
                    this.calculateResumoFinal();
                }, 100);
            });
        }
    }

    // Valores padrão
    setDefaultValues() {
        const dataBaseField = document.getElementById('dataBase');
        if (dataBaseField && !dataBaseField.value) {
            const today = new Date().toISOString().split('T')[0];
            dataBaseField.value = today;
        }

        const quantidadeField = document.getElementById('quantidade');
        if (quantidadeField && !quantidadeField.value) {
            quantidadeField.value = '1';
        }

        // Atualizar cálculos se já houver salário preenchido
        setTimeout(() => {
            this.updateCalculations();
        }, 100);
    }

    // VALIDAÇÕES ESPECÍFICAS
    validateNomeCliente() {
        const field = document.getElementById('nomeCliente');
        const value = field.value.trim();
        
        // Se campo está vazio, não é válido (deve ser preenchido via CNPJ)
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('nomeCliente', false, 'Nome será preenchido automaticamente após inserir CNPJ válido.');
            return false;
        }
        
        // Se tem valor, é porque foi preenchido via API
        if (FormValidator.validators.minLength(value, 2)) {
            FormValidator.showValidation('nomeCliente', true, `Nome válido: ${value} ✓`);
            return true;
        }
        
        FormValidator.showValidation('nomeCliente', false, 'Nome inválido.');
        return false;
    }

    validateCNPJ() {
        const field = document.getElementById('cnpj');
        const value = field.value;
        
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('cnpj', false, 'CNPJ é obrigatório.');
            this.clearClientName();
            return false;
        }
        
        if (!FormValidator.validators.cnpj(value)) {
            FormValidator.showValidation('cnpj', false, 'CNPJ inválido. Verifique os dígitos verificadores.');
            this.clearClientName();
            return false;
        }
        
        FormValidator.showValidation('cnpj', true, 'CNPJ válido ✓');
        
        // Buscar dados do CNPJ automaticamente
        this.searchCNPJData(value);
        return true;
    }

    // Buscar dados do CNPJ na BrasilAPI
    async searchCNPJData(cnpj) {
        const loadingIndicator = document.getElementById('cnpj-loading');
        const nomeClienteField = document.getElementById('nomeCliente');
        
        try {
            // Mostrar loading
            this.showLoading(true);
            
            // Limpar CNPJ para API (somente números)
            const cnpjClean = cnpj.replace(/\D/g, '');
            
            // Fazer requisição para BrasilAPI
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
            
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Verificar se empresa está ativa (código 2 = ATIVA, ou texto "ATIVA")
            const situacaoAtiva = data.situacao_cadastral === 'ATIVA' || 
                                 data.situacao_cadastral === '2' || 
                                 data.situacao_cadastral === 2;
            
            if (!situacaoAtiva) {
                const situacaoTexto = this.getSituacaoTexto(data.situacao_cadastral);
                FormValidator.showValidation('cnpj', false, `Empresa com situação: ${situacaoTexto}`);
                this.clearClientName();
                return;
            }
            
            // Preencher nome do cliente
            const nomeEmpresa = data.razao_social || data.nome_fantasia || 'Nome não encontrado';
            nomeClienteField.value = nomeEmpresa;
            
            // Validação de sucesso
            FormValidator.showValidation('nomeCliente', true, `Empresa encontrada: ${nomeEmpresa} ✓`);
            
            console.log('✅ Dados do CNPJ encontrados:', {
                razaoSocial: data.razao_social,
                nomeFantasia: data.nome_fantasia,
                situacao: data.situacao_cadastral,
                cidade: `${data.municipio}/${data.uf}`
            });
            
        } catch (error) {
            console.error('❌ Erro ao buscar CNPJ:', error);
            
            if (error.message.includes('404')) {
                FormValidator.showValidation('cnpj', false, 'CNPJ não encontrado na base de dados.');
            } else if (error.message.includes('429')) {
                FormValidator.showValidation('cnpj', false, 'Muitas consultas. Tente novamente em alguns segundos.');
            } else {
                FormValidator.showValidation('cnpj', false, 'Erro na consulta. Verifique sua conexão.');
            }
            
            this.clearClientName();
        } finally {
            // Esconder loading
            this.showLoading(false);
        }
    }

    // Mostrar/esconder loading indicator
    showLoading(show) {
        const loadingIndicator = document.getElementById('cnpj-loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    // Limpar nome do cliente
    clearClientName() {
        const nomeClienteField = document.getElementById('nomeCliente');
        if (nomeClienteField) {
            nomeClienteField.value = '';
            FormValidator.showValidation('nomeCliente', false, '');
        }
    }

    // Converter código de situação cadastral em texto
    getSituacaoTexto(codigo) {
        const situacoes = {
            '1': 'NULA',
            '2': 'ATIVA',
            '3': 'SUSPENSA', 
            '4': 'INAPTA',
            '8': 'BAIXADA',
            1: 'NULA',
            2: 'ATIVA',
            3: 'SUSPENSA',
            4: 'INAPTA', 
            8: 'BAIXADA',
            'NULA': 'NULA',
            'ATIVA': 'ATIVA',
            'SUSPENSA': 'SUSPENSA',
            'INAPTA': 'INAPTA',
            'BAIXADA': 'BAIXADA'
        };
        
        return situacoes[codigo] || `Situação desconhecida (${codigo})`;
    }

    validateResponsavel() {
        const field = document.getElementById('responsavelProposta');
        const value = field.value.trim();
        
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('responsavelProposta', false, 'Nome do responsável é obrigatório.');
            return false;
        }
        
        if (!FormValidator.validators.minLength(value, 2)) {
            FormValidator.showValidation('responsavelProposta', false, 'Nome deve ter pelo menos 2 caracteres.');
            return false;
        }
        
        FormValidator.showValidation('responsavelProposta', true, 'Nome válido ✓');
        return true;
    }

    validateCargo() {
        const field = document.getElementById('cargo');
        const value = field.value.trim();
        
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('cargo', false, 'Cargo é obrigatório.');
            return false;
        }
        
        if (!FormValidator.validators.minLength(value, 2)) {
            FormValidator.showValidation('cargo', false, 'Cargo deve ter pelo menos 2 caracteres.');
            return false;
        }
        
        FormValidator.showValidation('cargo', true, 'Cargo válido ✓');
        return true;
    }

    validateRegimeTributario() {
        const field = document.getElementById('regimeTributario');
        const value = field.value;

        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('regimeTributario', false, 'Regime tributário é obrigatório.');
            return false;
        }

        if (value === 'simples' || value === 'lucro') {
            const regimeTexto = value === 'simples' ? 'Simples Nacional' : 'Lucro Presumido / Real';
            FormValidator.showValidation('regimeTributario', true, `${regimeTexto} selecionado ✓`);
            return true;
        }

        FormValidator.showValidation('regimeTributario', false, 'Regime tributário inválido.');
        return false;
    }

    validateQuantidade() {
        const field = document.getElementById('quantidade');
        const value = field.value;
        
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('quantidade', false, 'Quantidade é obrigatória.');
            return false;
        }
        
        if (!FormValidator.validators.positiveInteger(value)) {
            FormValidator.showValidation('quantidade', false, 'Quantidade deve ser um número inteiro maior que zero.');
            return false;
        }
        
        const numValue = parseInt(value);
        if (numValue > 999) {
            FormValidator.showValidation('quantidade', false, 'Quantidade máxima: 999 colaboradores.');
            return false;
        }
        
        FormValidator.showValidation('quantidade', true, 'Quantidade válida ✓');
        return true;
    }

    validateSalario() {
        const field = document.getElementById('salarioBruto');
        const value = field.value;
        
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('salarioBruto', false, 'Salário é obrigatório.');
            return false;
        }
        
        const numericValue = FormValidator.masks.currencyToFloat(value);
        
        if (!numericValue || numericValue <= 0) {
            FormValidator.showValidation('salarioBruto', false, 'Digite um valor válido maior que zero.');
            return false;
        }
        
        const salarioMinimo = 1320;
        if (numericValue < salarioMinimo) {
            FormValidator.showValidation('salarioBruto', false, `Valor muito baixo. Salário mínimo: R$ ${salarioMinimo.toLocaleString('pt-BR')}`);
            return false;
        }
        
        if (numericValue > 50000) {
            FormValidator.showValidation('salarioBruto', false, 'Valor muito alto. Confirme se está correto.');
            return false;
        }
        
        FormValidator.showValidation('salarioBruto', true, `Salário válido: ${value} ✓`);
        return true;
    }

    validateDataBase() {
        const field = document.getElementById('dataBase');
        const value = field.value;
        
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('dataBase', false, 'Data base é obrigatória.');
            return false;
        }
        
        if (!FormValidator.validators.date(value)) {
            FormValidator.showValidation('dataBase', false, 'Data inválida.');
            return false;
        }
        
        const dataBase = new Date(value);
        const hoje = new Date();
        const diferencaAnos = (hoje - dataBase) / (365.25 * 24 * 60 * 60 * 1000);
        
        if (diferencaAnos > 2) {
            FormValidator.showValidation('dataBase', false, 'Data muito antiga. Use uma data mais recente.');
            return false;
        }
        
        const umMesNoFuturo = new Date();
        umMesNoFuturo.setMonth(umMesNoFuturo.getMonth() + 1);
        
        if (dataBase > umMesNoFuturo) {
            FormValidator.showValidation('dataBase', false, 'Data muito no futuro.');
            return false;
        }
        
        FormValidator.showValidation('dataBase', true, 'Data válida ✓');
        return true;
    }

    validateValorPassagem() {
        const field = document.getElementById('valorPassagemDiaria');
        const value = field.value;
        
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('valorPassagemDiaria', false, 'Valor da passagem é obrigatório.');
            return false;
        }
        
        const numericValue = FormValidator.masks.currencyToFloat(value);
        
        if (!numericValue || numericValue <= 0) {
            FormValidator.showValidation('valorPassagemDiaria', false, 'Digite um valor válido maior que zero.');
            return false;
        }
        
        if (numericValue > 200) {
            FormValidator.showValidation('valorPassagemDiaria', false, 'Valor muito alto para passagem diária.');
            return false;
        }
        
        FormValidator.showValidation('valorPassagemDiaria', true, `Valor válido: ${value} ✓`);
        return true;
    }

    validateAuxilioRefeicao() {
        const field = document.getElementById('auxilioRefeicaoValorDiario');
        const value = field.value;
        
        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('auxilioRefeicaoValorDiario', false, 'Valor do auxílio-refeição é obrigatório.');
            return false;
        }
        
        const numericValue = FormValidator.masks.currencyToFloat(value);
        
        if (!numericValue || numericValue <= 0) {
            FormValidator.showValidation('auxilioRefeicaoValorDiario', false, 'Digite um valor válido maior que zero.');
            return false;
        }
        
        if (numericValue > 100) {
            FormValidator.showValidation('auxilioRefeicaoValorDiario', false, 'Valor muito alto para auxílio-refeição diário.');
            return false;
        }
        
        FormValidator.showValidation('auxilioRefeicaoValorDiario', true, `Valor válido: ${value} ✓`);
        return true;
    }

    validatePercentualMargemLucro() {
        const field = document.getElementById('percentualMargemLucro');
        const value = field.value;

        if (!FormValidator.validators.required(value)) {
            FormValidator.showValidation('percentualMargemLucro', false, 'Percentual de margem de lucro é obrigatório.');
            return false;
        }

        // Extrair valor numérico, considerando vírgula como separador decimal
        const cleanValue = value.replace('%', '').replace(',', '.');
        const numericValue = parseFloat(cleanValue);
        
        if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
            FormValidator.showValidation('percentualMargemLucro', false, 'Percentual deve ser um número entre 0 e 100.');
            return false;
        }

        FormValidator.showValidation('percentualMargemLucro', true, `Percentual válido: ${value} ✓`);
        return true;
    }

    validatePercentualCustosAdicionais() {
        const field = document.getElementById('percentualCustosAdicionais');
        const value = field.value;

        // Campo opcional - se vazio, é válido
        if (!value || value.trim() === '') {
            return true;
        }

        // Se preenchido, validar formato
        const cleanValue = value.replace('%', '').replace(',', '.');
        const numericValue = parseFloat(cleanValue);
        
        if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
            FormValidator.showValidation('percentualCustosAdicionais', false, 'Percentual deve ser um número entre 0 e 100.');
            return false;
        }

        FormValidator.showValidation('percentualCustosAdicionais', true, `Percentual válido: ${value} ✓`);
        return true;
    }

    validateAliquotaSimplesNacional() {
        const field = document.getElementById('aliquotaSimplesNacional');
        const value = field.value;

        // Campo opcional - se vazio, é válido
        if (!value || value.trim() === '') {
            return true;
        }

        // Se preenchido, validar formato
        const cleanValue = value.replace('%', '').replace(',', '.');
        const numericValue = parseFloat(cleanValue);
        
        if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
            FormValidator.showValidation('aliquotaSimplesNacional', false, 'Alíquota deve ser um número entre 0 e 100.');
            return false;
        }

        FormValidator.showValidation('aliquotaSimplesNacional', true, `Alíquota válida: ${value} ✓`);
        return true;
    }

    // Manipulação de dados
    handleFieldChange(field) {
        this.formData[field.id] = field.value;
        this.updateCalculations();
        
        // Forçar cálculo dos blocos 7 e 8 sempre que houver mudanças significativas
        const camposCriticos = [
            'salarioBruto', 'valorPassagemDiaria', 'auxilioRefeicaoValorDiario',
            'regimeTributario', 'percentualMargemLucro', 'percentualCustosAdicionais',
            'aliquotaSimplesNacional'
        ];
        
        // Para campos de custos adicionais também
        for (let i = 1; i <= 5; i++) {
            camposCriticos.push(`valorCusto${i}`);
        }
        
        if (camposCriticos.includes(field.id)) {
            // Aguardar um pouco para garantir que outros cálculos terminaram
            setTimeout(() => {
                this.calculateResumoFinal();
                this.calculateMargemLucro();
                this.calculateCustosTributos();
                this.calculateResumoFinal();
            }, 150);
        }
    }

    updateCalculations() {
        // Obter salário bruto atual
        const salarioBrutoField = document.getElementById('salarioBruto');
        if (salarioBrutoField && salarioBrutoField.value) {
            const salarioBruto = FormValidator.masks.currencyToFloat(salarioBrutoField.value);
            if (salarioBruto > 0) {
                this.calculateEncargos(salarioBruto);
                
                // Recalcular transporte se houver valor de passagem (para atualizar desconto funcionário)
                const passagemField = document.getElementById('valorPassagemDiaria');
                if (passagemField && passagemField.value) {
                    const valorPassagem = FormValidator.masks.currencyToFloat(passagemField.value);
                    if (valorPassagem > 0) {
                        this.calculateTransporte(valorPassagem);
                    }
                }
            }
        }
        
        // Calcular transporte (apenas se não foi calculado acima)
        const passagemField = document.getElementById('valorPassagemDiaria');
        if (passagemField && passagemField.value && !this.calculations.salarioBruto) {
            const valorPassagem = FormValidator.masks.currencyToFloat(passagemField.value);
            if (valorPassagem > 0) {
                this.calculateTransporte(valorPassagem);
            }
        }
        
        // Calcular auxílio-refeição
        const refeicaoField = document.getElementById('auxilioRefeicaoValorDiario');
        if (refeicaoField && refeicaoField.value) {
            const valorRefeicao = FormValidator.masks.currencyToFloat(refeicaoField.value);
            if (valorRefeicao > 0) {
                this.calculateAuxilioRefeicao(valorRefeicao);
            }
        }
        
        // Calcular custos adicionais
        this.calculateCustosAdicionais();
        
        // Calcular subtotais dos blocos
        this.calculateSubtotals();
        
        // Calcular resumo final primeiro (para ter o totalGeral)
        this.calculateResumoFinal();
        
        // Calcular margem de lucro (Bloco 8) - precisa do totalGeral
        this.calculateMargemLucro();
        
        // Calcular custos adicionais e tributos (Bloco 7) - sempre, independente do 7.1
        this.calculateCustosTributos();
        
        // Recalcular resumo final após blocos 7 e 8
        this.calculateResumoFinal();
    }

    // Calcular encargos e benefícios
    calculateEncargos(salarioBruto) {
        // Verificar regime tributário
        const regimeTributario = document.getElementById('regimeTributario').value;
        
        // Só calcular se regime tributário estiver selecionado
        if (!regimeTributario) {
            console.log('⚠️ Regime tributário não selecionado. Cálculos suspensos.');
            return;
        }
        
        const isSimples = regimeTributario === 'simples';
        
        // Controlar visibilidade dos campos conforme regime
        const gruposLucroPresumido = [
            'grupo-inss', 'grupo-salario-educacao', 'grupo-sat', 
            'grupo-sesc-sesi', 'grupo-senai-senac', 'grupo-sebrae', 'grupo-incra'
        ];
        
        gruposLucroPresumido.forEach(grupoId => {
            const grupo = document.getElementById(grupoId);
            if (grupo) {
                grupo.style.display = isSimples ? 'none' : 'block';
            }
        });

        // Controlar visibilidade dos tributos no Bloco 7.2
        const tributosLucroPresumido = document.getElementById('tributos-lucro-presumido');
        const tributosSimplesNacional = document.getElementById('tributos-simples-nacional');
        
        if (tributosLucroPresumido) {
            tributosLucroPresumido.style.display = isSimples ? 'none' : 'block';
        }
        
        if (tributosSimplesNacional) {
            tributosSimplesNacional.style.display = isSimples ? 'block' : 'none';
        }

        // Calcular valores com novas fórmulas
        const decimoTerceiro = salarioBruto / 12;                    // Salário ÷ 12
        const adicionalFerias = salarioBruto / 12 / 3;              // Salário ÷ 12 ÷ 3 (1/3 Férias)
        const feriasProporcionais = salarioBruto / 12;              // Salário ÷ 12
        
        // Base de cálculo para encargos do Lucro Presumido: Salário + Total item 3.1
        const totalItem31 = decimoTerceiro + adicionalFerias + feriasProporcionais;
        const baseCalculoLucroPresumido = salarioBruto + totalItem31;
        
        // Base de cálculo para FGTS (ambos os regimes): Salário + 13º + 1/3 Férias + Férias
        const baseCalculoFGTS = salarioBruto + decimoTerceiro + adicionalFerias + feriasProporcionais;
        
        // Calcular encargos do Lucro Presumido/Real (apenas se não for Simples Nacional)
        let encargosLucroPresumido = {};
        if (!isSimples) {
            encargosLucroPresumido = {
                inss: baseCalculoLucroPresumido * 0.20,           // 20%
                salarioEducacao: baseCalculoLucroPresumido * 0.025,  // 2,50%
                sat: baseCalculoLucroPresumido * 0.0237,             // 2,37%
                sescSesi: baseCalculoLucroPresumido * 0.015,         // 1,50%
                senaiSenac: baseCalculoLucroPresumido * 0.01,        // 1,00%
                sebrae: baseCalculoLucroPresumido * 0.006,           // 0,60%
                incra: baseCalculoLucroPresumido * 0.002             // 0,20%
            };
        } else {
            // Zerar campos para Simples Nacional
            encargosLucroPresumido = {
                inss: 0, salarioEducacao: 0, sat: 0, sescSesi: 0, 
                senaiSenac: 0, sebrae: 0, incra: 0
            };
        }
        
        // Calcular FGTS (para ambos os regimes)
        const fgts = baseCalculoFGTS * 0.08;                   // 8% sobre base completa

        // Organizar valores calculados
        const valores = {
            decimoTerceiro: decimoTerceiro,
            adicionalFerias: adicionalFerias,
            feriasProporcionais: feriasProporcionais,
            ...encargosLucroPresumido,
            fgts: fgts,
            baseCalculoLucroPresumido: baseCalculoLucroPresumido,
            baseCalculoFGTS: baseCalculoFGTS,
            regimeSimples: isSimples
        };

        // Atualizar campos na tela
        this.updateCalculationField('decimoTerceiro', valores.decimoTerceiro);
        this.updateCalculationField('adicionalFerias', valores.adicionalFerias);
        this.updateCalculationField('feriasProporcionais', valores.feriasProporcionais);
        this.updateCalculationField('fgts', valores.fgts);
        
        // Atualizar percentuais nos displays
        this.updatePercentageDisplay('decimoTerceiro', valores.decimoTerceiro, salarioBruto);
        this.updatePercentageDisplay('adicionalFerias', valores.adicionalFerias, salarioBruto);
        this.updatePercentageDisplay('feriasProporcionais', valores.feriasProporcionais, salarioBruto);
        this.updatePercentageDisplay('fgts', valores.fgts, salarioBruto);
        
        // Atualizar campos específicos do Lucro Presumido/Real
        if (!isSimples) {
            this.updateCalculationField('inss', valores.inss);
            this.updateCalculationField('salarioEducacao', valores.salarioEducacao);
            this.updateCalculationField('sat', valores.sat);
            this.updateCalculationField('sescSesi', valores.sescSesi);
            this.updateCalculationField('senaiSenac', valores.senaiSenac);
            this.updateCalculationField('sebrae', valores.sebrae);
            this.updateCalculationField('incra', valores.incra);
            
            // Atualizar percentuais
            this.updatePercentageDisplay('inss', valores.inss, salarioBruto);
            this.updatePercentageDisplay('salarioEducacao', valores.salarioEducacao, salarioBruto);
            this.updatePercentageDisplay('sat', valores.sat, salarioBruto);
            this.updatePercentageDisplay('sescSesi', valores.sescSesi, salarioBruto);
            this.updatePercentageDisplay('senaiSenac', valores.senaiSenac, salarioBruto);
            this.updatePercentageDisplay('sebrae', valores.sebrae, salarioBruto);
            this.updatePercentageDisplay('incra', valores.incra, salarioBruto);
        } else {
            // Limpar campos para Simples Nacional
            ['inss', 'salarioEducacao', 'sat', 'sescSesi', 'senaiSenac', 'sebrae', 'incra'].forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = 'R$ 0,00';
            });
        }

        // Salvar nos dados de cálculo
        this.calculations.encargos = valores;
        this.calculations.salarioBruto = salarioBruto;
        
        console.log('✅ Encargos calculados com regime específico:', {
            regime: isSimples ? 'Simples Nacional' : 'Lucro Presumido/Real',
            salarioBruto: this.formatCurrency(salarioBruto),
            baseCalculoLucroPresumido: this.formatCurrency(baseCalculoLucroPresumido),
            baseCalculoFGTS: this.formatCurrency(baseCalculoFGTS),
            totalEncargos: this.formatCurrency(
                (valores.inss || 0) + (valores.salarioEducacao || 0) + (valores.sat || 0) +
                (valores.sescSesi || 0) + (valores.senaiSenac || 0) + (valores.sebrae || 0) +
                (valores.incra || 0) + valores.fgts
            )
        });
        
        // Calcular totais dos submódulos e blocos
        this.calculateSubtotals();
        
        // Recalcular percentuais dos encargos sociais com a base correta (salário + total 3.1)
        setTimeout(() => {
            const totalSubmodulo31 = this.calculations.totais?.submodulo31 || 0;
            const baseCalculoPercentuais = salarioBruto + totalSubmodulo31;
            
            // Atualizar percentuais dos encargos sociais (3.2) com base correta
            if (!isSimples) {
                this.updatePercentageDisplay('inss', valores.inss, salarioBruto);
                this.updatePercentageDisplay('salarioEducacao', valores.salarioEducacao, salarioBruto);
                this.updatePercentageDisplay('sat', valores.sat, salarioBruto);
                this.updatePercentageDisplay('sescSesi', valores.sescSesi, salarioBruto);
                this.updatePercentageDisplay('senaiSenac', valores.senaiSenac, salarioBruto);
                this.updatePercentageDisplay('sebrae', valores.sebrae, salarioBruto);
                this.updatePercentageDisplay('incra', valores.incra, salarioBruto);
            }
            this.updatePercentageDisplay('fgts', valores.fgts, salarioBruto);
        }, 100);
        
        // Calcular provisão para rescisão
        this.calculateProvisaoRescisao(salarioBruto);
    }

    // Calcular totais dos submódulos e blocos
    calculateSubtotals() {
        const encargos = this.calculations.encargos || {};
        const transporte = this.calculations.transporte || {};
        const auxilioRefeicao = this.calculations.auxilioRefeicao || {};
        const provisaoRescisao = this.calculations.provisaoRescisao || {};

        // Submódulo 3.1 - 13º Salário e Férias
        const totalSubmodulo31 = (encargos.decimoTerceiro || 0) + 
                                 (encargos.adicionalFerias || 0) + 
                                 (encargos.feriasProporcionais || 0);
        this.updateCalculationField('totalSubmodulo31', totalSubmodulo31);

        // Submódulo 3.2 - Encargos Sociais
        const totalSubmodulo32 = (encargos.inss || 0) + (encargos.fgts || 0) + (encargos.salarioEducacao || 0) + (encargos.sat || 0) + (encargos.sescSesi || 0) + (encargos.senaiSenac || 0) + (encargos.sebrae || 0) + (encargos.incra || 0);
        this.updateCalculationField('totalSubmodulo32', totalSubmodulo32);

        // Submódulo 3.3 - Transporte e Auxílio-Refeição
        const totalSubmodulo33 = (transporte.totalMensal || 0) + 
                                 (auxilioRefeicao.totalMensal || 0) - 
                                 (transporte.descontoFuncionario || 0);
        this.updateCalculationField('totalSubmodulo33', totalSubmodulo33);

        // Total do Bloco 3
        const totalBloco3 = totalSubmodulo31 + totalSubmodulo32 + totalSubmodulo33;
        this.updateCalculationField('totalBloco3', totalBloco3);

        // Submódulo 4.1 - Aviso Prévio Indenizado (agora é o único submódulo)
        const totalSubmodulo41 = (provisaoRescisao.avisoPrevioIndenizado || 0) +
                                 (provisaoRescisao.fgtsAvisoPrevioIndenizado || 0) +
                                 (provisaoRescisao.multaFgtsAvisoPrevioIndenizado || 0);
        this.updateCalculationField('totalSubmodulo41', totalSubmodulo41);

        // Total do Bloco 4 (agora é apenas o submódulo 4.1)
        const totalBloco4 = totalSubmodulo41;
        this.updateCalculationField('totalBloco4', totalBloco4);

        // Salvar totais nos dados de cálculo
        this.calculations.totais = {
            submodulo31: totalSubmodulo31,
            submodulo32: totalSubmodulo32,
            submodulo33: totalSubmodulo33,
            bloco3: totalBloco3,
            submodulo41: totalSubmodulo41,
            bloco4: totalBloco4
        };

        console.log('✅ Subtotais calculados:', this.calculations.totais);
    }

    // Calcular provisão para rescisão
    calculateProvisaoRescisao(salarioBruto) {
        // Verificar se regime tributário está selecionado
        const regimeTributario = document.getElementById('regimeTributario').value;
        if (!regimeTributario) {
            console.log('⚠️ Regime tributário não selecionado. Cálculo de provisão suspenso.');
            return;
        }

        // Novas fórmulas para provisão de rescisão
        const avisoPrevioIndenizado = salarioBruto / 12;                    // Salário ÷ 12
        const fgtsAvisoPrevioIndenizado = salarioBruto * 0.08;             // 8% do salário
        const multaFgtsAvisoPrevioIndenizado = fgtsAvisoPrevioIndenizado * 0.40; // 40% do FGTS

        // Organizar valores calculados
        const valores = {
            avisoPrevioIndenizado: avisoPrevioIndenizado,
            fgtsAvisoPrevioIndenizado: fgtsAvisoPrevioIndenizado,
            multaFgtsAvisoPrevioIndenizado: multaFgtsAvisoPrevioIndenizado
        };

        // Atualizar campos na tela
        this.updateCalculationField('avisoPrevioIndenizado', valores.avisoPrevioIndenizado);
        this.updateCalculationField('fgtsAvisoPrevioIndenizado', valores.fgtsAvisoPrevioIndenizado);
        this.updateCalculationField('multaFgtsAvisoPrevioIndenizado', valores.multaFgtsAvisoPrevioIndenizado);

        // Atualizar percentuais nos displays
        this.updatePercentageDisplay('avisoPrevioIndenizado', valores.avisoPrevioIndenizado, salarioBruto);
        this.updatePercentageDisplay('fgtsAvisoPrevioIndenizado', valores.fgtsAvisoPrevioIndenizado, salarioBruto);
        this.updatePercentageDisplay('multaFgtsAvisoPrevioIndenizado', valores.multaFgtsAvisoPrevioIndenizado, salarioBruto);

        // Salvar nos dados de cálculo
        this.calculations.provisaoRescisao = valores;
        
        console.log('✅ Provisão para rescisão calculada com novas fórmulas:', {
            salarioBruto: this.formatCurrency(salarioBruto),
            avisoPrevioIndenizado: this.formatCurrency(avisoPrevioIndenizado),
            fgtsAvisoPrevioIndenizado: this.formatCurrency(fgtsAvisoPrevioIndenizado),
            multaFgtsAvisoPrevioIndenizado: this.formatCurrency(multaFgtsAvisoPrevioIndenizado)
        });
        
        // Calcular resumo total
        this.calculateResumoFinal();
        
        // Atualizar subtotais
        this.calculateSubtotals();
    }

    // Calcular transporte
    calculateTransporte(valorPassagemDiaria) {
        // Cálculos
        const totalMensal = valorPassagemDiaria * 23;          // 23 dias
        
        // Obter salário bruto para calcular o desconto do funcionário (6% do salário)
        const salarioBruto = this.calculations.salarioBruto || 0;
        let descontoFuncionario = salarioBruto * 0.06; // 6% do salário bruto
        
        // Validação: desconto não pode ser maior que o total mensal
        if (descontoFuncionario > totalMensal) {
            descontoFuncionario = totalMensal;
            console.log(`⚠️ Desconto do funcionário limitado ao total mensal: ${this.formatCurrency(totalMensal)}`);
        }

        // Atualizar campos na tela
        this.updateCalculationField('transporteTotalMensal', totalMensal);
        this.updateCalculationField('descontoFuncionario', descontoFuncionario);

        // Salvar nos dados de cálculo
        this.calculations.transporte = {
            valorDiario: valorPassagemDiaria,
            totalMensal: totalMensal,
            descontoFuncionario: descontoFuncionario,
            descontoLimitado: descontoFuncionario < (salarioBruto * 0.06) // Flag para indicar se foi limitado
        };
    }

    // Calcular auxílio-refeição
    calculateAuxilioRefeicao(valorDiario) {
        // Cálculo
        const totalMensal = valorDiario * 23; // 23 dias

        // Atualizar campo na tela
        this.updateCalculationField('auxilioRefeicaoTotalMensal', totalMensal);

        // Salvar nos dados de cálculo
        this.calculations.auxilioRefeicao = {
            valorDiario: valorDiario,
            totalMensal: totalMensal
        };
    }

    // Calcular custos adicionais
    calculateCustosAdicionais() {
        const valores = {
            valorCusto1: 0,
            valorCusto2: 0,
            valorCusto3: 0,
            valorCusto4: 0,
            valorCusto5: 0
        };

        // Obter valores dos campos
        for (let i = 1; i <= 5; i++) {
            const valorField = document.getElementById(`valorCusto${i}`);
            if (valorField && valorField.value) {
                const valor = FormValidator.masks.currencyToFloat(valorField.value);
                if (valor > 0) {
                    valores[`valorCusto${i}`] = valor;
                }
            }
        }

        // Calcular total do bloco 5
        const totalBloco5 = valores.valorCusto1 + valores.valorCusto2 + valores.valorCusto3 + 
                           valores.valorCusto4 + valores.valorCusto5;

        // Atualizar campo na tela
        this.updateCalculationField('totalBloco5', totalBloco5);

        // Salvar nos dados de cálculo
        this.calculations.custosAdicionais = valores;
        this.calculations.custosAdicionais.total = totalBloco5;

        console.log('✅ Custos adicionais calculados:', valores);
    }

    // Calcular custos adicionais e tributos (Bloco 7)
    calculateCustosTributos() {
        // Calcular totalGeralEmpregado diretamente dos campos, não depender de calculations.resumo
        const salarioBrutoField = document.getElementById('salarioBruto');
        const totalBloco3Field = document.getElementById('totalBloco3');
        const totalBloco4Field = document.getElementById('totalBloco4');
        const totalBloco5Field = document.getElementById('totalBloco5');

        const salarioBruto = salarioBrutoField ? FormValidator.masks.currencyToFloat(salarioBrutoField.value) : 0;
        const totalBloco3 = totalBloco3Field ? FormValidator.masks.currencyToFloat(totalBloco3Field.value) : 0;
        const totalBloco4 = totalBloco4Field ? FormValidator.masks.currencyToFloat(totalBloco4Field.value) : 0;
        const totalBloco5 = totalBloco5Field ? FormValidator.masks.currencyToFloat(totalBloco5Field.value) : 0;

        const totalGeralEmpregado = salarioBruto + totalBloco3 + totalBloco4 + totalBloco5;

        const percentualCustosField = document.getElementById('percentualCustosAdicionais');
        const regimeTributario = document.getElementById('regimeTributario').value;
        const isSimples = regimeTributario === 'simples';
        
        // Se não há total geral, limpar tudo
        if (totalGeralEmpregado <= 0) {
            this.updateCalculationField('valorCustosAdicionais', 0);
            this.updateCalculationField('pis', 0);
            this.updateCalculationField('cofins', 0);
            this.updateCalculationField('iss', 0);
            this.updateCalculationField('tributoSimplesNacional', 0);
            this.updateCalculationField('totalSubmodulo71', 0);
            this.updateCalculationField('totalSubmodulo72', 0);
            this.updateCalculationField('totalBloco7', 0);
            return;
        }

        // 7.1 - Custos Adicionais (opcional)
        let valorCustosAdicionais = 0;
        let percentualCustos = 0;

        if (percentualCustosField && percentualCustosField.value && percentualCustosField.value.trim() !== '') {
            // Converter percentual considerando vírgula como separador decimal
            const cleanValue = percentualCustosField.value.replace('%', '').replace(',', '.');
            percentualCustos = parseFloat(cleanValue) / 100;
            
            if (!isNaN(percentualCustos) && percentualCustos >= 0) {
                valorCustosAdicionais = totalGeralEmpregado * percentualCustos;
            }
        }

        // Atualizar campos 7.1
        this.updateCalculationField('valorCustosAdicionais', valorCustosAdicionais);
        this.updateCalculationField('totalSubmodulo71', valorCustosAdicionais);

        // 7.2 - Tributos (calculados sobre a base que será definida no Bloco 8)
        const baseCalculoTributos = this.calculations.margemLucro?.baseCalculoTributos || 0;
        
        let pis = 0, cofins = 0, iss = 0, tributoSimplesNacional = 0, totalTributos = 0;

        if (baseCalculoTributos > 0) {
            if (isSimples) {
                // Simples Nacional - usar alíquota informada pelo usuário
                const aliquotaSimplesField = document.getElementById('aliquotaSimplesNacional');
                if (aliquotaSimplesField && aliquotaSimplesField.value) {
                    const cleanAliquota = aliquotaSimplesField.value.replace('%', '').replace(',', '.');
                    const aliquotaSimples = parseFloat(cleanAliquota) / 100;
                    
                    if (!isNaN(aliquotaSimples)) {
                        tributoSimplesNacional = baseCalculoTributos * aliquotaSimples;
                        totalTributos = tributoSimplesNacional;
                        
                        // Atualizar percentual exibido
                        const percentSimplesElement = document.getElementById('percentSimplesNacional');
                        if (percentSimplesElement) {
                            percentSimplesElement.textContent = `${(aliquotaSimples * 100).toFixed(2).replace('.', ',')}%`;
                        }
                    }
                }
                
                // Limpar campos do Lucro Presumido
                this.updateCalculationField('pis', 0);
                this.updateCalculationField('cofins', 0);
                this.updateCalculationField('iss', 0);
                
            } else {
                // Lucro Presumido/Real - usar PIS/COFINS/ISS
                pis = baseCalculoTributos * 0.0059;     // 0,59%
                cofins = baseCalculoTributos * 0.0271;  // 2,71%
                iss = baseCalculoTributos * 0.05;       // 5,00%
                totalTributos = pis + cofins + iss;
                
                // Atualizar campos do Lucro Presumido
                this.updateCalculationField('pis', pis);
                this.updateCalculationField('cofins', cofins);
                this.updateCalculationField('iss', iss);
                
                // Limpar campo do Simples Nacional
                this.updateCalculationField('tributoSimplesNacional', 0);
            }
        } else {
            // Se não há base de cálculo, zerar tributos
            this.updateCalculationField('pis', 0);
            this.updateCalculationField('cofins', 0);
            this.updateCalculationField('iss', 0);
            this.updateCalculationField('tributoSimplesNacional', 0);
        }

        // Atualizar campos 7.2
        this.updateCalculationField('tributoSimplesNacional', tributoSimplesNacional);
        this.updateCalculationField('totalSubmodulo72', totalTributos);

        // Total Bloco 7
        const totalBloco7 = valorCustosAdicionais + totalTributos;
        this.updateCalculationField('totalBloco7', totalBloco7);

        // Salvar nos cálculos
        this.calculations.custosTributos = {
            percentualCustos: percentualCustos,
            valorCustosAdicionais: valorCustosAdicionais,
            pis: pis,
            cofins: cofins,
            iss: iss,
            tributoSimplesNacional: tributoSimplesNacional,
            totalTributos: totalTributos,
            totalBloco7: totalBloco7,
            baseCalculoTributos: baseCalculoTributos,
            regimeSimples: isSimples
        };

        console.log('✅ Custos e tributos calculados:', this.calculations.custosTributos);
    }

    // Calcular margem de lucro (Bloco 8) com lógica reversa
    calculateMargemLucro() {
        const totalGeralEmpregado = this.calculations.resumo?.totalGeral || 0;
        const custosTributos = this.calculations.custosTributos || {};
        const percentualMargemField = document.getElementById('percentualMargemLucro');
        const regimeTributario = document.getElementById('regimeTributario').value;
        const isSimples = regimeTributario === 'simples';
        
        if (!percentualMargemField || !percentualMargemField.value || totalGeralEmpregado <= 0) {
            // Limpar campos se não houver dados
            this.updateCalculationField('valorMargemLucro', 0);
            this.updateCalculationField('valorTotalComMargem', 0);
            this.updateCalculationField('baseCalculoTributos', 0);
            return;
        }

        // Converter percentual considerando vírgula como separador decimal
        const cleanValue = percentualMargemField.value.replace('%', '').replace(',', '.');
        const percentualMargem = parseFloat(cleanValue) / 100;

        // Determinar taxa de tributos baseada no regime
        let taxaTributos = 0;
        
        if (isSimples) {
            // Simples Nacional - usar alíquota informada pelo usuário
            const aliquotaSimplesField = document.getElementById('aliquotaSimplesNacional');
            if (aliquotaSimplesField && aliquotaSimplesField.value) {
                const cleanAliquota = aliquotaSimplesField.value.replace('%', '').replace(',', '.');
                const aliquotaSimples = parseFloat(cleanAliquota) / 100;
                if (!isNaN(aliquotaSimples)) {
                    taxaTributos = aliquotaSimples;
                }
            }
        } else {
            // Lucro Presumido/Real - usar PIS + COFINS + ISS
            taxaTributos = 0.0059 + 0.0271 + 0.05; // 8,30%
        }

        // Cálculo reverso da margem considerando tributos
        // Fórmula: Base = (Custos + Custos Adicionais) / (1 - Margem - Taxa de Tributos)
        const custosTotais = totalGeralEmpregado + (custosTributos.valorCustosAdicionais || 0);
        
        const baseCalculoTributos = custosTotais / (1 - percentualMargem - taxaTributos);
        
        // Valores finais
        const tributosFinal = baseCalculoTributos * taxaTributos;
        const valorMargemLucro = baseCalculoTributos * percentualMargem;
        const valorTotalComMargem = custosTotais + tributosFinal + valorMargemLucro;

        // Atualizar campos
        this.updateCalculationField('baseCalculoTributos', baseCalculoTributos);
        this.updateCalculationField('valorMargemLucro', valorMargemLucro);
        this.updateCalculationField('valorTotalComMargem', valorTotalComMargem);

        // Salvar nos cálculos
        this.calculations.margemLucro = {
            percentualMargem: percentualMargem,
            custosTotais: custosTotais,
            taxaTributos: taxaTributos,
            baseCalculoTributos: baseCalculoTributos,
            tributosFinal: tributosFinal,
            valorMargemLucro: valorMargemLucro,
            valorTotalComMargem: valorTotalComMargem,
            regimeSimples: isSimples
        };

        console.log('✅ Margem de lucro calculada:', {
            regime: isSimples ? 'Simples Nacional' : 'Lucro Presumido/Real',
            percentualMargem: `${(percentualMargem * 100).toFixed(2).replace('.', ',')}%`,
            taxaTributos: `${(taxaTributos * 100).toFixed(2).replace('.', ',')}%`,
            custosTotais: this.formatCurrency(custosTotais),
            baseCalculoTributos: this.formatCurrency(baseCalculoTributos),
            tributosFinal: this.formatCurrency(tributosFinal),
            valorMargemLucro: this.formatCurrency(valorMargemLucro),
            valorTotal: this.formatCurrency(valorTotalComMargem),
            margemRealizada: `${((valorMargemLucro / valorTotalComMargem) * 100).toFixed(2).replace('.', ',')}%`
        });

        // Recalcular tributos com a nova base
        this.calculateCustosTributos();
    }

    // Atualizar campo calculado
    updateCalculationField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.log(`❌ Campo não encontrado: ${fieldId}`);
            return;
        }

        const formattedValue = this.formatCurrency(value);
        field.value = formattedValue;
        
        // Verificar se é o campo de desconto do funcionário e se foi limitado
        if (fieldId === 'descontoFuncionario' && this.calculations.transporte?.descontoLimitado) {
            // Adicionar classe especial para indicar que foi limitado
            field.classList.add('highlighted-warning');
            
            // Adicionar tooltip ou indicação visual
            field.title = 'Valor limitado ao total mensal do transporte';
            
            // Remover a classe após alguns segundos
            setTimeout(() => {
                field.classList.remove('highlighted-warning');
            }, 3000);
        } else {
            // Animação de destaque normal
            field.classList.add('highlighted');
            setTimeout(() => {
                field.classList.remove('highlighted');
            }, 300);
        }
    }

    // Atualizar percentual de campo com fórmula
    updatePercentageDisplay(fieldId, value, salarioBruto) {
        if (salarioBruto <= 0) return;
        
        // Campos dos encargos sociais (3.2) que devem usar salário + total 3.1 como base
        const camposEncargos32 = ['inss', 'salarioEducacao', 'sat', 'sescSesi', 'senaiSenac', 'sebrae', 'incra', 'fgts'];
        
        let baseCalculo = salarioBruto;
        
        // Se for um campo de encargos sociais (3.2), usar salário + total 3.1 como base
        if (camposEncargos32.includes(fieldId)) {
            const totalSubmodulo31 = this.calculations.totais?.submodulo31 || 0;
            baseCalculo = salarioBruto + totalSubmodulo31;
        }
        
        const percentage = (value / baseCalculo) * 100;
        const percentageElement = document.querySelector(`#${fieldId}`).parentElement.querySelector('.calculation-percent');
        
        if (percentageElement) {
            percentageElement.textContent = `${percentage.toFixed(2)}%`;
            
            // Adicionar classe para animação e cor diferenciada
            percentageElement.classList.add('dynamic');
            
            // Remover a classe após a animação
            setTimeout(() => {
                percentageElement.classList.remove('dynamic');
            }, 500);
        }
    }

    // Formatar moeda
    formatCurrency(value) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Validar todos os campos
    validateAllFields() {
        const regimeTributario = document.getElementById('regimeTributario').value;
        const isSimples = regimeTributario === 'simples';
        
        const validations = [
            this.validateNomeCliente(),
            this.validateCNPJ(),
            this.validateResponsavel(),
            this.validateCargo(),
            this.validateRegimeTributario(),
            this.validateQuantidade(),
            this.validateSalario(),
            this.validateDataBase(),
            this.validateValorPassagem(),
            this.validateAuxilioRefeicao(),
            this.validatePercentualMargemLucro()
        ];
        
        // Adicionar validação da alíquota do Simples Nacional apenas se regime for Simples Nacional
        if (isSimples) {
            const aliquotaSimplesField = document.getElementById('aliquotaSimplesNacional');
            if (aliquotaSimplesField && aliquotaSimplesField.value && aliquotaSimplesField.value.trim() !== '') {
                validations.push(this.validateAliquotaSimplesNacional());
            }
        }
        
        return validations.every(valid => valid === true);
    }

    // Obter dados do formulário
    getFormData() {
        const data = {};
        
        const fields = document.querySelectorAll('.form-input');
        fields.forEach(field => {
            if (field.type === 'number') {
                data[field.id] = parseFloat(field.value) || 0;
            } else if (['salarioBruto', 'valorPassagemDiaria', 'auxilioRefeicaoValorDiario'].includes(field.id)) {
                // Campos monetários editáveis
                data[field.id] = FormValidator.masks.currencyToFloat(field.value);
            } else if (field.classList.contains('calculation-result')) {
                // Campos calculados - converter de moeda para número
                data[field.id] = FormValidator.masks.currencyToFloat(field.value);
            } else {
                data[field.id] = field.value;
            }
        });
        
        // Incluir cálculos
        data.calculations = this.calculations;
        
        return data;
    }

    // Resetar percentuais para valores originais
    resetPercentageDisplays() {
        const resetMappings = [
            { fieldId: 'decimoTerceiro', originalText: 'Salário ÷ 12' },
            { fieldId: 'adicionalFerias', originalText: 'Salário ÷ 12 ÷ 3' },
            { fieldId: 'feriasProporcionais', originalText: 'Salário ÷ 12' },
            { fieldId: 'inss', originalText: '20,00%' },
            { fieldId: 'fgts', originalText: '8,00%' },
            { fieldId: 'salarioEducacao', originalText: '2,50%' },
            { fieldId: 'sat', originalText: '2,37%' },
            { fieldId: 'sescSesi', originalText: '1,50%' },
            { fieldId: 'senaiSenac', originalText: '1,00%' },
            { fieldId: 'sebrae', originalText: '0,60%' },
            { fieldId: 'incra', originalText: '0,20%' },
            { fieldId: 'avisoPrevioIndenizado', originalText: 'Salário ÷ 12' },
            { fieldId: 'fgtsAvisoPrevioIndenizado', originalText: '8% do Salário' },
            { fieldId: 'multaFgtsAvisoPrevioIndenizado', originalText: '40% do FGTS' },
            { fieldId: 'aliquotaSimplesNacional', originalText: '0,00%' }
        ];

        resetMappings.forEach(({ fieldId, originalText }) => {
            const percentageElement = document.querySelector(`#${fieldId}`)?.parentElement?.querySelector('.calculation-percent');
            if (percentageElement) {
                percentageElement.textContent = originalText;
                percentageElement.classList.remove('dynamic');
            }
        });
    }

    // Limpar formulário
    clearForm() {
        const fields = document.querySelectorAll('.form-input');
        fields.forEach(field => {
            if (!field.classList.contains('calculation-result')) {
                field.value = '';
                // Remover readonly temporariamente para limpar, depois restaurar
                if (field.hasAttribute('readonly')) {
                    field.removeAttribute('readonly');
                    field.value = '';
                    field.setAttribute('readonly', '');
                }
            }
            // Campos calculados mantêm "R$ 0,00" - não alteramos o valor
            field.classList.remove('error', 'success', 'highlighted');
        });
        
        const validations = document.querySelectorAll('.validation-message');
        validations.forEach(validation => {
            // Limpar timeout se existir
            if (validation.timeoutId) {
                clearTimeout(validation.timeoutId);
                validation.timeoutId = null;
            }
            validation.style.display = 'none';
            validation.classList.remove('error', 'success');
        });
        
        // Esconder loading se estiver visível
        this.showLoading(false);
        
        // Resetar percentuais para valores originais
        this.resetPercentageDisplays();
        
        // Limpar cálculos
        this.calculations = {};
        this.formData = {};
        
        this.setDefaultValues();
    }

    // Calcular resumo final - ÚNICA FUNÇÃO DE RESUMO
    calculateResumoFinal() {
        console.log('🔄 Calculando resumo final...');

        // Buscar valores diretamente dos campos já calculados
        const salarioBrutoField = document.getElementById('salarioBruto');
        const totalBloco3Field = document.getElementById('totalBloco3');
        const totalBloco4Field = document.getElementById('totalBloco4');
        const totalBloco5Field = document.getElementById('totalBloco5');
        const totalBloco7Field = document.getElementById('totalBloco7');
        const valorMargemLucroField = document.getElementById('valorMargemLucro');

        const resumoSalarioBruto = salarioBrutoField ? FormValidator.masks.currencyToFloat(salarioBrutoField.value) : 0;
        const resumoEncargos = totalBloco3Field ? FormValidator.masks.currencyToFloat(totalBloco3Field.value) : 0;
        const resumoProvisaoRescisao = totalBloco4Field ? FormValidator.masks.currencyToFloat(totalBloco4Field.value) : 0;
        const resumoCustosAdicionais = totalBloco5Field ? FormValidator.masks.currencyToFloat(totalBloco5Field.value) : 0;
        const resumoCustosTributos = totalBloco7Field ? FormValidator.masks.currencyToFloat(totalBloco7Field.value) : 0;
        const resumoMargemLucro = valorMargemLucroField ? FormValidator.masks.currencyToFloat(valorMargemLucroField.value) : 0;

        const resumoTotalGeralFinal = resumoSalarioBruto + resumoEncargos + resumoProvisaoRescisao + 
                                     resumoCustosAdicionais + resumoCustosTributos + resumoMargemLucro;

        // Atualizar campos do resumo final (Bloco 9) diretamente
        const resumoFinalSalarioBrutoField = document.getElementById('resumoFinalSalarioBruto');
        const resumoFinalEncargosField = document.getElementById('resumoFinalEncargos');
        const resumoFinalProvisaoRescisaoField = document.getElementById('resumoFinalProvisaoRescisao');
        const resumoFinalCustosAdicionaisField = document.getElementById('resumoFinalCustosAdicionais');
        const resumoFinalCustosTributosField = document.getElementById('resumoFinalCustosTributos');
        const resumoFinalMargemLucroField = document.getElementById('resumoFinalMargemLucro');
        const resumoFinalTotalGeralField = document.getElementById('resumoFinalTotalGeral');

        if (resumoFinalSalarioBrutoField) resumoFinalSalarioBrutoField.value = this.formatCurrency(resumoSalarioBruto);
        if (resumoFinalEncargosField) resumoFinalEncargosField.value = this.formatCurrency(resumoEncargos);
        if (resumoFinalProvisaoRescisaoField) resumoFinalProvisaoRescisaoField.value = this.formatCurrency(resumoProvisaoRescisao);
        if (resumoFinalCustosAdicionaisField) resumoFinalCustosAdicionaisField.value = this.formatCurrency(resumoCustosAdicionais);
        if (resumoFinalCustosTributosField) resumoFinalCustosTributosField.value = this.formatCurrency(resumoCustosTributos);
        if (resumoFinalMargemLucroField) resumoFinalMargemLucroField.value = this.formatCurrency(resumoMargemLucro);
        if (resumoFinalTotalGeralField) resumoFinalTotalGeralField.value = this.formatCurrency(resumoTotalGeralFinal);

        // Atualizar campos do resumo intermediário (Bloco 6 - sem blocos 7 e 8)
        const resumoSalarioBrutoField = document.getElementById('resumoSalarioBruto');
        const resumoEncargosField = document.getElementById('resumoEncargos');
        const resumoProvisaoRescisaoField = document.getElementById('resumoProvisaoRescisao');
        const resumoCustosAdicionaisField = document.getElementById('resumoCustosAdicionais');
        const resumoTotalGeralField = document.getElementById('resumoTotalGeral');

        const resumoTotalGeral = resumoSalarioBruto + resumoEncargos + resumoProvisaoRescisao + resumoCustosAdicionais;

        if (resumoSalarioBrutoField) resumoSalarioBrutoField.value = this.formatCurrency(resumoSalarioBruto);
        if (resumoEncargosField) resumoEncargosField.value = this.formatCurrency(resumoEncargos);
        if (resumoProvisaoRescisaoField) resumoProvisaoRescisaoField.value = this.formatCurrency(resumoProvisaoRescisao);
        if (resumoCustosAdicionaisField) resumoCustosAdicionaisField.value = this.formatCurrency(resumoCustosAdicionais);
        if (resumoTotalGeralField) resumoTotalGeralField.value = this.formatCurrency(resumoTotalGeral);

        // Salvar para uso interno nos cálculos dos blocos 7 e 8
        this.calculations.resumo = {
            salarioBruto: resumoSalarioBruto,
            encargos: resumoEncargos,
            provisaoRescisao: resumoProvisaoRescisao,
            custosAdicionais: resumoCustosAdicionais,
            totalGeral: resumoSalarioBruto + resumoEncargos + resumoProvisaoRescisao + resumoCustosAdicionais
        };

        this.calculations.resumoFinal = {
            salarioBruto: resumoSalarioBruto,
            encargos: resumoEncargos,
            provisaoRescisao: resumoProvisaoRescisao,
            custosAdicionais: resumoCustosAdicionais,
            custosTributos: resumoCustosTributos,
            margemLucro: resumoMargemLucro,
            totalGeralFinal: resumoTotalGeralFinal
        };

        console.log('✅ Resumo final atualizado:', {
            salario: this.formatCurrency(resumoSalarioBruto),
            encargos: this.formatCurrency(resumoEncargos),
            provisao: this.formatCurrency(resumoProvisaoRescisao),
            custosAdicionais: this.formatCurrency(resumoCustosAdicionais),
            custosTributos: this.formatCurrency(resumoCustosTributos),
            margemLucro: this.formatCurrency(resumoMargemLucro),
            total: this.formatCurrency(resumoTotalGeralFinal)
        });
    }
}

// Inicializar aplicação
const calculadora = new CalculadoraTerceirizacao();

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.calculadora = calculadora;
    window.FormValidator = FormValidator;
}
