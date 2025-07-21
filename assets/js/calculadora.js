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
        this.calculationCache = new Map(); // Cache para cálculos
        this.validationCache = new Map(); // Cache para validações
        this.isInitialized = false;
        this.criticalCalculationTimeout = null;
        this.universalInputTimeout = null; // Para monitoramento universal
        
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
        // Implementar debouncing para melhorar performance
        let calculationTimeout = null;
        
        const debounceCalculation = (callback, delay = 150) => {
            clearTimeout(calculationTimeout);
            calculationTimeout = setTimeout(callback, delay);
        };

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
                debounceCalculation(() => {
                    // Recalcular tudo quando regime tributário mudar
                    const salarioBrutoField = document.getElementById('salarioBruto');
                    if (salarioBrutoField && salarioBrutoField.value) {
                        const salarioBruto = FormValidator.masks.currencyToFloat(salarioBrutoField.value);
                        if (salarioBruto > 0) {
                            this.calculateEncargos(salarioBruto);
                        }
                    }
                    
                    // Recalcular blocos 7 e 8
                    this.calculateResumoFinal();
                    this.calculateMargemLucro();
                    this.calculateCustosTributos();
                    this.calculateResumoFinal();
                });
            });
        }

        // Event listeners otimizados para campos críticos
        const criticalFields = [
            { id: 'percentualMargemLucro', delay: 200 },
            { id: 'aliquotaSimplesNacional', delay: 200 },
            { id: 'percentualCustosAdicionais', delay: 200 },
            { id: 'quantidade', delay: 100 }
        ];

        criticalFields.forEach(({ id, delay }) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('input', () => {
                    debounceCalculation(() => {
                        this.calculateResumoFinal();
                        this.calculateMargemLucro();
                        this.calculateCustosTributos();
                        this.calculateResumoFinal();
                    }, delay);
                });
            }
        });

        // Event listener específico para quantidade (afeta total múltiplos empregados)
        const quantidadeField = document.getElementById('quantidade');
        if (quantidadeField) {
            quantidadeField.addEventListener('input', () => {
                debounceCalculation(() => {
                    // Quantidade só afeta a exibição do total múltiplo, não os cálculos base
                    this.calculateResumoFinal();
                    console.log('🔄 Recálculo após mudança na quantidade de empregados');
                }, 100);
            });
        }

        // Event listeners para reposição de férias
        const substituirFeriasRadios = document.querySelectorAll('input[name="substituirFerias"]');
        substituirFeriasRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                debounceCalculation(() => {
                    // Recalcular tudo quando opção de reposição mudar
                    this.calculateResumoFinal(); // Atualiza Bloco 6 com/sem reposição
                    this.calculateMargemLucro(); // Recalcula margem com novo total
                    this.calculateCustosTributos(); // Recalcula tributos
                    this.calculateResumoFinal(); // Atualiza resumo final
                    
                    console.log('🔄 Recálculo completo após mudança na reposição de férias');
                }, 150);
            });
        });

        // Event listeners específicos para campos de custos adicionais
        for (let i = 1; i <= 5; i++) {
            const tipoField = document.getElementById(`tipoCusto${i}`);
            const valorField = document.getElementById(`valorCusto${i}`);
            
            if (tipoField) {
                tipoField.addEventListener('change', () => {
                    debounceCalculation(() => {
                        this.calculateCustosAdicionais();
                        this.debounceCriticalCalculation();
                        console.log(`🔄 Recálculo após mudança no tipo de custo ${i}`);
                    }, 100);
                });
            }
            
            if (valorField) {
                valorField.addEventListener('input', () => {
                    debounceCalculation(() => {
                        this.calculateCustosAdicionais();
                        this.debounceCriticalCalculation();
                        console.log(`🔄 Recálculo após mudança no valor de custo ${i}`);
                    }, 150);
                });
            }
        }

        // Otimizar prevenção de zoom no mobile
        this.setupMobileOptimizations();
        
        // Sistema fail-safe: monitorar TODOS os inputs para garantir que nada seja perdido
        this.setupUniversalInputMonitoring();
    }
    
    // Sistema universal de monitoramento de inputs
    setupUniversalInputMonitoring() {
        // Selecionar TODOS os inputs que não são readonly/calculation-result
        const allInputs = document.querySelectorAll('input:not(.calculation-result):not([readonly]), select, textarea');
        
        console.log(`🔧 Configurando monitoramento universal para ${allInputs.length} campos`);
        
        allInputs.forEach(input => {
            // Verificar se já tem event listener específico
            const hasSpecificListener = this.hasSpecificEventListener(input.id);
            
            if (!hasSpecificListener) {
                console.log(`➕ Adicionando monitoramento universal para: ${input.id}`);
                
                // Event listener universal com debounce
                const eventType = input.type === 'radio' || input.type === 'checkbox' ? 'change' : 'input';
                
                input.addEventListener(eventType, () => {
                    console.log(`🔄 Mudança detectada (universal): ${input.id} = "${input.value}"`);
                    
                    // Usar debounce para evitar sobrecarga
                    if (this.universalInputTimeout) {
                        clearTimeout(this.universalInputTimeout);
                    }
                    
                    this.universalInputTimeout = setTimeout(() => {
                        // Determinar se é um campo crítico
                        const fieldType = this.getFieldCalculationType(input.id);
                        
                        if (fieldType === 'critical') {
                            this.forceCompleteRecalculation(`Campo crítico universal: ${input.id}`);
                        } else if (fieldType === 'basic') {
                            this.updateCalculations();
                        }
                        // display-only não faz nada
                    }, 200);
                });
            }
        });
    }
    
    // Verificar se um campo já tem event listener específico
    hasSpecificEventListener(fieldId) {
        const specificFields = [
            'regimeTributario', 'percentualMargemLucro', 'aliquotaSimplesNacional', 
            'percentualCustosAdicionais', 'quantidade', 'substituirFerias',
            'tipoCusto1', 'tipoCusto2', 'tipoCusto3', 'tipoCusto4', 'tipoCusto5',
            'valorCusto1', 'valorCusto2', 'valorCusto3', 'valorCusto4', 'valorCusto5'
        ];
        
        return specificFields.includes(fieldId) || fieldId.includes('substituirFerias');
    }

    // Método separado para otimizações mobile
    setupMobileOptimizations() {
        if (!this.isMobile()) return;

        // Cache do viewport para evitar múltiplas consultas
        const viewport = document.querySelector('meta[name="viewport"]');
        
        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('form-input')) {
                // Usar requestAnimationFrame para melhor performance
                requestAnimationFrame(() => {
                    if (viewport) {
                        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                    }
                    
                    // Scroll otimizado
                    window.scrollTo({
                        top: Math.max(0, window.pageYOffset - 1),
                        behavior: 'smooth'
                    });
                });
            }
        }, { passive: true });
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
        
        // Buscar dados do CNPJ na BrasilAPI com cache
        this.searchCNPJData(value);
        return true;
    }

    // Buscar dados do CNPJ na BrasilAPI com cache
    async searchCNPJData(cnpj) {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        const cacheKey = `cnpj_${cleanCnpj}`;
        
        // Verificar cache primeiro
        if (this.validationCache.has(cacheKey)) {
            const cachedResult = this.validationCache.get(cacheKey);
            this.applyCNPJResult(cachedResult);
            return;
        }

        const loadingIndicator = document.getElementById('cnpj-loading');
        const nomeClienteField = document.getElementById('nomeCliente');
        
        try {
            // Mostrar loading
            this.showLoading(true);
            
            // Fazer requisição para BrasilAPI
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                // Timeout de 10 segundos
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Validar dados recebidos
            if (!data || typeof data !== 'object') {
                throw new Error('Dados inválidos recebidos da API');
            }
            
            // Verificar se empresa está ativa
            const situacaoAtiva = data.situacao_cadastral === 'ATIVA' || 
                                 data.situacao_cadastral === '2' || 
                                 data.situacao_cadastral === 2;
            
            const result = {
                success: situacaoAtiva,
                nomeEmpresa: data.razao_social || data.nome_fantasia || 'Nome não encontrado',
                situacao: data.situacao_cadastral,
                data: data
            };
            
            // Salvar no cache (por 5 minutos)
            this.validationCache.set(cacheKey, result);
            setTimeout(() => {
                this.validationCache.delete(cacheKey);
            }, 5 * 60 * 1000);
            
            // Aplicar resultado
            this.applyCNPJResult(result);
            
        } catch (error) {
            console.error('❌ Erro ao buscar CNPJ:', error);
            
            // Tratamento de erros mais específico
            let errorMessage = 'Erro na consulta. Verifique sua conexão.';
            
            if (error.name === 'TimeoutError') {
                errorMessage = 'Consulta expirou. Tente novamente.';
            } else if (error.message.includes('404')) {
                errorMessage = 'CNPJ não encontrado na base de dados.';
            } else if (error.message.includes('429')) {
                errorMessage = 'Muitas consultas. Tente novamente em alguns segundos.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Problema de conectividade. Verifique sua internet.';
            }
            
            FormValidator.showValidation('cnpj', false, errorMessage);
            this.clearClientName();
            
        } finally {
            // Esconder loading
            this.showLoading(false);
        }
    }

    // Aplicar resultado da consulta CNPJ
    applyCNPJResult(result) {
        const nomeClienteField = document.getElementById('nomeCliente');
        
        if (result.success) {
            // Preencher nome do cliente
            nomeClienteField.value = result.nomeEmpresa;
            FormValidator.showValidation('nomeCliente', true, `Empresa encontrada: ${result.nomeEmpresa} ✓`);
            
            console.log('✅ Dados do CNPJ (cache/API):', {
                razaoSocial: result.data.razao_social,
                nomeFantasia: result.data.nome_fantasia,
                situacao: result.situacao,
                fonte: this.validationCache.has(`cnpj_${result.data.cnpj || ''}`) ? 'cache' : 'api'
            });
        } else {
            const situacaoTexto = this.getSituacaoTexto(result.situacao);
            FormValidator.showValidation('cnpj', false, `Empresa com situação: ${situacaoTexto}`);
            this.clearClientName();
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

    // Manipulação de dados otimizada
    handleFieldChange(field) {
        // Evitar recálculos desnecessários se valor não mudou
        const currentValue = field.value;
        const previousValue = this.formData[field.id];
        
        if (currentValue === previousValue) {
            return; // Não há mudança, evitar recálculo
        }
        
        // Salvar novo valor
        this.formData[field.id] = currentValue;
        
        // Log para debug (pode ser removido em produção)
        console.log(`📝 Campo alterado: ${field.id} = "${currentValue}"`);
        
        // Determinar tipo de recálculo necessário baseado no campo
        const fieldType = this.getFieldCalculationType(field.id);
        
        switch (fieldType) {
            case 'basic':
                this.updateCalculations();
                break;
            case 'critical':
                this.updateCalculations();
                // Para campos críticos, recalcular blocos 7 e 8 com debounce
                this.debounceCriticalCalculation();
                console.log(`⚡ Campo crítico alterado: ${field.id} - recálculo completo agendado`);
                break;
            case 'display-only':
                // Campos que só afetam exibição, não necessitam recálculo completo
                console.log(`🎨 Campo display-only alterado: ${field.id} - sem recálculo`);
                break;
            default:
                this.updateCalculations();
                console.log(`📊 Campo básico alterado: ${field.id} - recálculo básico`);
        }
    }
    
    // Classificar tipo de campo para otimizar recálculos
    getFieldCalculationType(fieldId) {
        const criticalFields = [
            // Campos básicos que afetam todos os cálculos
            'salarioBruto', 'valorPassagemDiaria', 'auxilioRefeicaoValorDiario',
            'regimeTributario', 'quantidade',
            
            // Campos de percentuais e alíquotas
            'percentualMargemLucro', 'percentualCustosAdicionais',
            'aliquotaSimplesNacional',
            
            // Campos de custos adicionais (serão adicionados dinamicamente abaixo)
            // valorCusto1, valorCusto2, etc.
            
            // Campos que podem afetar cálculos indiretos
            'tipoCusto1', 'tipoCusto2', 'tipoCusto3', 'tipoCusto4', 'tipoCusto5'
        ];
        
        const displayOnlyFields = [
            'nomeCliente', 'cnpj', 'responsavelProposta', 'cargo', 'dataBase'
        ];
        
        // Adicionar campos de custos adicionais aos críticos
        for (let i = 1; i <= 5; i++) {
            criticalFields.push(`valorCusto${i}`);
        }
        
        if (criticalFields.includes(fieldId)) {
            return 'critical';
        } else if (displayOnlyFields.includes(fieldId)) {
            return 'display-only';
        } else {
            // Campos não classificados são tratados como básicos
            return 'basic';
        }
    }
    
    // Debounce para cálculos críticos
    debounceCriticalCalculation() {
        if (this.criticalCalculationTimeout) {
            clearTimeout(this.criticalCalculationTimeout);
        }
        
        this.criticalCalculationTimeout = setTimeout(() => {
            console.log('🔄 Iniciando recálculo crítico completo...');
            
            // Sequência de recálculo na ordem correta
            this.calculateResumoFinal();      // 1. Atualizar resumo (Bloco 6)
            this.calculateMargemLucro();      // 2. Recalcular margem (Bloco 8)
            this.calculateCustosTributos();   // 3. Recalcular tributos (Bloco 7)
            this.calculateResumoFinal();      // 4. Atualizar resumo final (Bloco 9)
            
            console.log('✅ Recálculo crítico completo finalizado');
        }, 200);
    }

    // === MÉTODOS AUXILIARES PARA PERFORMANCE ===

    // Limpar cache quando necessário
    clearCache(type = 'all') {
        if (type === 'all' || type === 'calculations') {
            this.calculationCache.clear();
        }
        if (type === 'all' || type === 'validations') {
            this.validationCache.clear();
        }
        console.log(`🧹 Cache limpo: ${type}`);
    }

    // Cache para cálculos complexos
    getCachedCalculation(key, calculator) {
        if (this.calculationCache.has(key)) {
            return this.calculationCache.get(key);
        }
        
        const result = calculator();
        this.calculationCache.set(key, result);
        return result;
    }

    // Verificar se recálculo é necessário
    shouldRecalculate(fieldId, newValue) {
        return this.formData[fieldId] !== newValue;
    }

    // Força recálculo completo (método público para uso quando necessário)
    forceCompleteRecalculation(reason = 'Manual') {
        console.log(`🔄 Força recálculo completo - Motivo: ${reason}`);
        
        // Limpar cache para forçar recálculo
        this.clearCache('calculations');
        
        // Executar sequência completa
        this.calculateResumoFinal();
        this.calculateMargemLucro();
        this.calculateCustosTributos();
        this.calculateResumoFinal();
        
        console.log('✅ Força recálculo completo finalizado');
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
                sat: baseCalculoLucroPresumido * 0.03,             // 2,37%
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
        // Usar o valor do campo "Total p/ empregado antes de impostos e margem" do Bloco 6
        // para calcular os Custos Adicionais (7.1)
        const resumoTotalGeralField = document.getElementById('resumoTotalGeral');
        const totalBloco6 = resumoTotalGeralField ? FormValidator.masks.currencyToFloat(resumoTotalGeralField.value) : 0;
        
        // Para tributos, usar a Base de Cálculo para Tributos se disponível
        const baseCalculoTributosField = document.getElementById('baseCalculoTributos');
        const baseCalculoTributos = baseCalculoTributosField ? FormValidator.masks.currencyToFloat(baseCalculoTributosField.value) : 0;

        const percentualCustosField = document.getElementById('percentualCustosAdicionais');
        const regimeTributario = document.getElementById('regimeTributario').value;
        const isSimples = regimeTributario === 'simples';
        
        // Se não há valores, limpar tudo
        if (totalBloco6 <= 0) {
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

        // 7.1 - Custos Adicionais (calculados sobre o Total p/ empregado antes de impostos e margem)
        let valorCustosAdicionais = 0;
        let percentualCustos = 0;

        if (percentualCustosField && percentualCustosField.value && percentualCustosField.value.trim() !== '') {
            // Converter percentual considerando vírgula como separador decimal
            const cleanValue = percentualCustosField.value.replace('%', '').replace(',', '.');
            percentualCustos = parseFloat(cleanValue) / 100;
            
            if (!isNaN(percentualCustos) && percentualCustos >= 0) {
                valorCustosAdicionais = totalBloco6 * percentualCustos;
            }
        }

        // Atualizar campos 7.1
        this.updateCalculationField('valorCustosAdicionais', valorCustosAdicionais);
        this.updateCalculationField('totalSubmodulo71', valorCustosAdicionais);

        // 7.2 - Tributos (calculados sobre a base de cálculo para tributos)
        const baseParaTributos = baseCalculoTributos > 0 ? baseCalculoTributos : 0;
        
        let pis = 0, cofins = 0, iss = 0, tributoSimplesNacional = 0, totalTributos = 0;

        if (baseParaTributos > 0) {
            if (isSimples) {
                // Simples Nacional - usar alíquota informada pelo usuário
                const aliquotaSimplesField = document.getElementById('aliquotaSimplesNacional');
                if (aliquotaSimplesField && aliquotaSimplesField.value) {
                    const cleanAliquota = aliquotaSimplesField.value.replace('%', '').replace(',', '.');
                    const aliquotaSimples = parseFloat(cleanAliquota) / 100;
                    
                    if (!isNaN(aliquotaSimples)) {
                        tributoSimplesNacional = baseParaTributos * aliquotaSimples;
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
                pis = baseParaTributos * 0.0065;     // 0,65%
                cofins = baseParaTributos * 0.03;  // 3,00%
                iss = baseParaTributos * 0.05;       // 5,00%
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
            baseCalculoTributos: baseParaTributos,
            totalBloco6: totalBloco6,
            regimeSimples: isSimples
        };

        console.log('✅ Custos calculados sobre Bloco 6, tributos sobre Base:', {
            totalBloco6: this.formatCurrency(totalBloco6),
            percentualCustos: `${(percentualCustos * 100).toFixed(2).replace('.', ',')}%`,
            valorCustosAdicionais: this.formatCurrency(valorCustosAdicionais),
            baseCalculoTributos: this.formatCurrency(baseParaTributos),
            totalTributos: this.formatCurrency(totalTributos),
            totalBloco7: this.formatCurrency(totalBloco7)
        });
    }

    // Calcular margem de lucro (Bloco 8) com lógica correta
    calculateMargemLucro() {
        // Obter total do bloco 6 (antes de impostos e margem)
        const totalBloco6Field = document.getElementById('resumoTotalGeral');
        const totalBloco6 = totalBloco6Field ? FormValidator.masks.currencyToFloat(totalBloco6Field.value) : 0;
        
        const percentualMargemField = document.getElementById('percentualMargemLucro');
        const regimeTributario = document.getElementById('regimeTributario').value;
        const isSimples = regimeTributario === 'simples';
        
        if (!percentualMargemField || !percentualMargemField.value || totalBloco6 <= 0) {
            // Limpar campos se não houver dados
            this.updateCalculationField('valorMargemLucro', 0);
            this.updateCalculationField('valorTotalComMargem', 0);
            this.updateCalculationField('baseCalculoTributos', 0);
            return;
        }

        // Converter percentual considerando vírgula como separador decimal
        const cleanValue = percentualMargemField.value.replace('%', '').replace(',', '.');
        const percentualMargem = parseFloat(cleanValue) / 100;

        // Obter percentual de custos adicionais (7.1)
        const percentualCustosField = document.getElementById('percentualCustosAdicionais');
        let percentualCustos = 0;
        if (percentualCustosField && percentualCustosField.value && percentualCustosField.value.trim() !== '') {
            const cleanCustos = percentualCustosField.value.replace('%', '').replace(',', '.');
            percentualCustos = parseFloat(cleanCustos) / 100;
            if (isNaN(percentualCustos)) percentualCustos = 0;
        }

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

        // LÓGICA CORRETA DA MARGEM:
        // A margem de X% deve ser calculada sobre o TOTAL DE CUSTOS
        // Fórmula: ValorNF = TotalCustos × (1 + %Margem) / (1 - %Impostos)

        // Calcular total de custos
        const custosAdicionaisFixos = totalBloco6 * percentualCustos;
        const totalCustos = totalBloco6 + custosAdicionaisFixos;
        
        // Margem desejada sobre o total de custos
        const margemDesejada = totalCustos * percentualMargem;

        // Validar denominador
        const denominador = 1 - taxaTributos;
        if (denominador <= 0) {
            console.error('❌ Erro: A taxa de tributos é maior ou igual a 100%');
            this.clearMargemFields();
            return;
        }

        // Calcular valor da NF (Base de Cálculo para Tributos)
        const baseCalculoTributos = totalCustos * (1 + percentualMargem) / denominador;
        
        // Calcular valores finais
        const tributos = baseCalculoTributos * taxaTributos;
        const valorMargemLucro = margemDesejada;
        const valorTotalComMargem = baseCalculoTributos;

        // Atualizar campos na interface
        this.updateCalculationField('baseCalculoTributos', baseCalculoTributos);
        this.updateCalculationField('valorMargemLucro', valorMargemLucro);
        this.updateCalculationField('valorTotalComMargem', valorTotalComMargem);

        // Salvar dados nos cálculos
        this.calculations.margemLucro = {
            totalBloco6: totalBloco6,
            percentualMargem: percentualMargem,
            percentualCustos: percentualCustos,
            taxaTributos: taxaTributos,
            custosAdicionaisFixos: custosAdicionaisFixos,
            totalCustos: totalCustos,
            margemDesejada: margemDesejada,
            baseCalculoTributos: baseCalculoTributos,
            tributos: tributos,
            valorMargemLucro: valorMargemLucro,
            valorTotalComMargem: valorTotalComMargem,
            regimeSimples: isSimples
        };

        // Log detalhado para verificação
        this.logMargemCalculation();

        // Recalcular tributos com a nova base
        this.calculateCustosTributos();
    }

    // Método auxiliar para limpar campos da margem
    clearMargemFields() {
        this.updateCalculationField('valorMargemLucro', 0);
        this.updateCalculationField('valorTotalComMargem', 0);
        this.updateCalculationField('baseCalculoTributos', 0);
    }

    // Método auxiliar para log da margem
    logMargemCalculation() {
        const calcs = this.calculations.margemLucro;
        if (!calcs) return;

        console.log('✅ Margem calculada sobre custos (fórmula correta):', {
            regime: calcs.regimeSimples ? 'Simples Nacional' : 'Lucro Presumido/Real',
            entrada: {
                totalBloco6: this.formatCurrency(calcs.totalBloco6),
                percentualCustos: `${(calcs.percentualCustos * 100).toFixed(2).replace('.', ',')}%`,
                custosAdicionais: this.formatCurrency(calcs.custosAdicionaisFixos),
                totalCustos: this.formatCurrency(calcs.totalCustos),
                percentualMargem: `${(calcs.percentualMargem * 100).toFixed(2).replace('.', ',')}%`,
                margemDesejada: this.formatCurrency(calcs.margemDesejada)
            },
            calculo: {
                percentualTributos: `${(calcs.taxaTributos * 100).toFixed(2).replace('.', ',')}%`,
                denominador: (1 - calcs.taxaTributos).toFixed(4),
                baseCalculoTributos: this.formatCurrency(calcs.baseCalculoTributos),
                tributos: this.formatCurrency(calcs.tributos),
                margemLucro: this.formatCurrency(calcs.valorMargemLucro)
            },
            verificacao: {
                formula: 'ValorNF - Tributos - TotalCustos = Margem',
                valorNF: this.formatCurrency(calcs.baseCalculoTributos),
                menosTributos: this.formatCurrency(-calcs.tributos),
                menosCustos: this.formatCurrency(-calcs.totalCustos),
                resultado: this.formatCurrency(calcs.baseCalculoTributos - calcs.tributos - calcs.totalCustos),
                margemEsperada: this.formatCurrency(calcs.margemDesejada),
                diferenca: this.formatCurrency(Math.abs((calcs.baseCalculoTributos - calcs.tributos - calcs.totalCustos) - calcs.margemDesejada)),
                percentualReal: `${((calcs.valorMargemLucro / calcs.totalCustos) * 100).toFixed(2).replace('.', ',')}%`
            }
        });
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
            { fieldId: 'sat', originalText: '3,00%' },
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

    // Limpar formulário otimizado
    clearForm() {
        // Limpar cache para evitar dados obsoletos
        this.clearCache();
        
        // Cancelar TODOS os timeouts pendentes
        if (this.criticalCalculationTimeout) {
            clearTimeout(this.criticalCalculationTimeout);
            this.criticalCalculationTimeout = null;
        }
        
        if (this.universalInputTimeout) {
            clearTimeout(this.universalInputTimeout);
            this.universalInputTimeout = null;
        }
        
        // Usar DocumentFragment para melhor performance
        const fragment = document.createDocumentFragment();
        
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
            // Limpar classes de status
            field.classList.remove('error', 'success', 'highlighted');
        });
        
        // Limpar mensagens de validação de forma eficiente
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
        
        // Limpar dados de forma eficiente
        this.calculations = {};
        this.formData = {};
        
        // Definir valores padrão
        this.setDefaultValues();
        
        console.log('🧹 Formulário limpo e resetado');
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

        // Calcular total ANTES da reposição de férias (para uso no cálculo da reposição)
        const totalAntesReposicao = resumoSalarioBruto + resumoEncargos + resumoProvisaoRescisao + resumoCustosAdicionais;

        // Verificar se deve calcular reposição de férias
        const substituirFeriasSim = document.getElementById('substituirFeriasSim');
        const calcularReposicao = substituirFeriasSim && substituirFeriasSim.checked;
        
        let valorReposicaoFerias = 0;
        if (calcularReposicao && totalAntesReposicao > 0) {
            valorReposicaoFerias = totalAntesReposicao / 12; // Dividir por 12 conforme solicitado
        }

        // Atualizar campo de reposição de férias
        const reposicaoFeriasField = document.getElementById('reposicaoFerias');
        if (reposicaoFeriasField) {
            reposicaoFeriasField.value = this.formatCurrency(valorReposicaoFerias);
        }

        // Calcular total final INCLUINDO a reposição de férias
        const resumoTotalGeral = totalAntesReposicao + valorReposicaoFerias;

        // Para o total final do bloco 9, usar o "Valor Total com Margem" se disponível
        const valorTotalComMargemField = document.getElementById('valorTotalComMargem');
        const valorTotalComMargem = valorTotalComMargemField ? FormValidator.masks.currencyToFloat(valorTotalComMargemField.value) : 0;
        
        // Se há margem calculada, usar esse valor. Senão, somar manualmente
        const resumoTotalGeralFinal = valorTotalComMargem > 0 ? valorTotalComMargem : 
                                     resumoSalarioBruto + resumoEncargos + resumoProvisaoRescisao + 
                                     resumoCustosAdicionais + valorReposicaoFerias + resumoCustosTributos + resumoMargemLucro;

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
        if (resumoFinalCustosAdicionaisField) resumoFinalCustosAdicionaisField.value = this.formatCurrency(resumoCustosAdicionais + valorReposicaoFerias);
        if (resumoFinalCustosTributosField) resumoFinalCustosTributosField.value = this.formatCurrency(resumoCustosTributos);
        if (resumoFinalMargemLucroField) resumoFinalMargemLucroField.value = this.formatCurrency(resumoMargemLucro);
        if (resumoFinalTotalGeralField) resumoFinalTotalGeralField.value = this.formatCurrency(resumoTotalGeralFinal);

        // Atualizar campos do resumo intermediário (Bloco 6)
        const resumoSalarioBrutoField = document.getElementById('resumoSalarioBruto');
        const resumoEncargosField = document.getElementById('resumoEncargos');
        const resumoProvisaoRescisaoField = document.getElementById('resumoProvisaoRescisao');
        const resumoCustosAdicionaisField = document.getElementById('resumoCustosAdicionais');
        const resumoTotalGeralField = document.getElementById('resumoTotalGeral');

        if (resumoSalarioBrutoField) resumoSalarioBrutoField.value = this.formatCurrency(resumoSalarioBruto);
        if (resumoEncargosField) resumoEncargosField.value = this.formatCurrency(resumoEncargos);
        if (resumoProvisaoRescisaoField) resumoProvisaoRescisaoField.value = this.formatCurrency(resumoProvisaoRescisao);
        if (resumoCustosAdicionaisField) resumoCustosAdicionaisField.value = this.formatCurrency(resumoCustosAdicionais);
        if (resumoTotalGeralField) resumoTotalGeralField.value = this.formatCurrency(resumoTotalGeral);

        // Salvar para uso interno nos cálculos dos blocos 7 e 8 (SEM reposição para não afetar cálculos de tributos)
        this.calculations.resumo = {
            salarioBruto: resumoSalarioBruto,
            encargos: resumoEncargos,
            provisaoRescisao: resumoProvisaoRescisao,
            custosAdicionais: resumoCustosAdicionais,
            totalGeral: totalAntesReposicao, // Usar total ANTES da reposição para cálculos de margem e tributos
            reposicaoFerias: valorReposicaoFerias,
            totalComReposicao: resumoTotalGeral
        };

        this.calculations.resumoFinal = {
            salarioBruto: resumoSalarioBruto,
            encargos: resumoEncargos,
            provisaoRescisao: resumoProvisaoRescisao,
            custosAdicionais: resumoCustosAdicionais,
            reposicaoFerias: valorReposicaoFerias,
            custosTributos: resumoCustosTributos,
            margemLucro: resumoMargemLucro,
            totalGeralFinal: resumoTotalGeralFinal
        };

        console.log('✅ Resumo final atualizado:', {
            salario: this.formatCurrency(resumoSalarioBruto),
            encargos: this.formatCurrency(resumoEncargos),
            provisao: this.formatCurrency(resumoProvisaoRescisao),
            custosAdicionais: this.formatCurrency(resumoCustosAdicionais),
            reposicaoFerias: this.formatCurrency(valorReposicaoFerias),
            totalAntesImpostos: this.formatCurrency(resumoTotalGeral),
            custosTributos: this.formatCurrency(resumoCustosTributos),
            margemLucro: this.formatCurrency(resumoMargemLucro),
            total: this.formatCurrency(resumoTotalGeralFinal)
        });

        // Calcular e exibir total para múltiplos empregados
        this.calculateTotalMultiplosEmpregados(resumoTotalGeralFinal);
    }

    // Calcular total para múltiplos empregados
    calculateTotalMultiplosEmpregados(totalPorEmpregado) {
        const quantidadeField = document.getElementById('quantidade');
        const totalMultiplosDiv = document.getElementById('totalMultiplosEmpregados');
        const labelTotalMultiplos = document.getElementById('labelTotalMultiplos');
        const resumoFinalTotalMultiplo = document.getElementById('resumoFinalTotalMultiplo');

        if (!quantidadeField || !totalMultiplosDiv || !labelTotalMultiplos || !resumoFinalTotalMultiplo) {
            return;
        }

        const quantidade = parseInt(quantidadeField.value) || 1;

        if (quantidade > 1) {
            // Mostrar campo para múltiplos empregados
            totalMultiplosDiv.style.display = 'block';
            
            // Atualizar label com a quantidade
            labelTotalMultiplos.innerHTML = `<strong>Total para ${quantidade} Empregados</strong>`;
            
            // Calcular e exibir total multiplicado
            const totalMultiplo = totalPorEmpregado * quantidade;
            resumoFinalTotalMultiplo.value = this.formatCurrency(totalMultiplo);
            
            // Adicionar animação de destaque
            resumoFinalTotalMultiplo.classList.add('highlighted');
            setTimeout(() => {
                resumoFinalTotalMultiplo.classList.remove('highlighted');
            }, 500);
            
            console.log(`💼 Total para ${quantidade} empregados: ${this.formatCurrency(totalMultiplo)}`);
        } else {
            // Esconder campo se quantidade <= 1
            totalMultiplosDiv.style.display = 'none';
        }
    }

    // Verificar se o dispositivo é um mobile
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// EXPORTADOR DE ARQUIVOS
class FileExporter {
    constructor() {
        this.initializeExportButtons();
    }

    initializeExportButtons() {
        const pdfBtn = document.getElementById('exportPdfBtn');
        const csvBtn = document.getElementById('exportCsvBtn');

        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => this.exportToPDF());
        }

        if (csvBtn) {
            csvBtn.addEventListener('click', () => this.exportToCSV());
        }

        // Verificar se deve habilitar botões
        this.checkExportButtonsStatus();
    }

    // Verificar se todos os campos obrigatórios estão preenchidos
    checkExportButtonsStatus() {
        const requiredFields = [
            'cnpj', 'nomeCliente', 'responsavelProposta',
            'cargo', 'regimeTributario', 'quantidade', 'salarioBruto', 'dataBase',
            'valorPassagemDiaria', 'auxilioRefeicaoValorDiario', 'percentualMargemLucro'
        ];

        // Verificar campos condicionais baseados no regime tributário
        const regimeTributario = document.getElementById('regimeTributario')?.value;
        if (regimeTributario === 'simples') {
            requiredFields.push('aliquotaSimplesNacional');
        }

        let allFieldsFilled = true;
        const missingFields = [];

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field) {
                return; // Campo não existe, considerar como preenchido
            }
            
            const value = field.value.trim();
            const isValid = value && value !== '' && value !== 'R$ 0,00' && value !== '0,00%';
            
            if (!isValid) {
                allFieldsFilled = false;
                missingFields.push(fieldId);
            }
        });

        // Log apenas se houver campos faltando (para debug)
        if (missingFields.length > 0) {
            console.log('⚠️ Campos obrigatórios não preenchidos:', missingFields);
        }

        const pdfBtn = document.getElementById('exportPdfBtn');
        const csvBtn = document.getElementById('exportCsvBtn');

        if (pdfBtn) {
            pdfBtn.disabled = !allFieldsFilled;
        }
        if (csvBtn) {
            csvBtn.disabled = !allFieldsFilled;
        }
    }

    // Exportar para PDF
    async exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Configurações
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);
            const signatureAreaHeight = 40; // Altura necessária para área de assinatura
            
            // Cabeçalho
            this.addPDFHeader(pdf, margin, contentWidth);
            
            let currentY = 50; // Aumentado de 40 para 50 para dar mais espaço
            const blockMargin = 10;
            
            // Processar cada bloco
            const blocks = document.querySelectorAll('.calculation-block');
            
            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                
                // Calcular altura necessária do bloco
                const blockHeight = this.calculateBlockHeight(block);
                
                // Verificar se precisa de nova página (incluindo espaço para assinatura)
                const spaceNeeded = blockHeight + blockMargin + (i === blocks.length - 1 ? signatureAreaHeight : 0);
                
                if (currentY + spaceNeeded > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }
                
                // Adicionar bloco ao PDF
                currentY = await this.addBlockToPDF(pdf, block, currentY, margin, contentWidth);
                currentY += blockMargin;
            }
            
            // Verificar se há espaço para a área de assinatura na página atual
            if (currentY + signatureAreaHeight > pageHeight - margin) {
                pdf.addPage();
                currentY = margin;
            }
            
            // Adicionar área de assinatura
            this.addSignatureArea(pdf, pageHeight, margin, contentWidth, currentY);
            
            // Salvar PDF
            const nomeCliente = document.getElementById('nomeCliente')?.value || 'Cliente';
            const dataBase = document.getElementById('dataBase')?.value || new Date().toISOString().split('T')[0];
            const filename = `Calculadora_Terceirizacao_${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}_${dataBase}.pdf`;
            
            pdf.save(filename);
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF. Tente novamente.');
        }
    }

    // Adicionar cabeçalho do PDF
    addPDFHeader(pdf, margin, contentWidth) {
        // Título
        pdf.setFontSize(18);
        pdf.setTextColor(18, 35, 66); // Primary dark
        pdf.text('Calculadora de Custo de Terceirização', margin, margin + 10);
        
        // Subtítulo
        pdf.setFontSize(12);
        pdf.setTextColor(108, 117, 125); // Gray
        pdf.text('Sistema Profissional para Cálculo de Propostas Comerciais', margin, margin + 18);
        
        // Data de geração
        const today = new Date().toLocaleDateString('pt-BR');
        pdf.setFontSize(10);
        pdf.text(`Gerado em: ${today}`, margin, margin + 26);
        
        // Linha separadora
        pdf.setDrawColor(190, 163, 105); // Primary gold
        pdf.setLineWidth(0.5);
        pdf.line(margin, margin + 30, margin + contentWidth, margin + 30);
    }

    // Calcular altura do bloco (estimativa)
    calculateBlockHeight(block) {
        const submodules = block.querySelectorAll('.submodule');
        const formGroups = block.querySelectorAll('.form-group');
        
        let height = 0;
        
        // Título do bloco
        height += 15;
        
        // Contar apenas campos que têm valores (não vazios)
        let fieldsWithValues = 0;
        formGroups.forEach(group => {
            const input = group.querySelector('.form-input');
            const value = input?.value || '';
            if (value && value !== 'R$ 0,00' && value !== '0,00%' && value !== '') {
                fieldsWithValues++;
            }
        });
        
        // Calcular altura baseada nos campos com valores (2 campos por linha)
        const fieldRows = Math.ceil(fieldsWithValues / 2);
        height += fieldRows * 10; // 10mm por linha de campos
        
        // Adicionar altura dos submódulos
        submodules.forEach(submodule => {
            // Título do submódulo
            height += 8;
            
            // Campos do submódulo
            const subFields = submodule.querySelectorAll('.form-group');
            let subFieldsWithValues = 0;
            
            subFields.forEach(group => {
                const input = group.querySelector('.form-input');
                const value = input?.value || '';
                if (value && value !== 'R$ 0,00' && value !== '0,00%' && value !== '') {
                    subFieldsWithValues++;
                }
            });
            
            const subFieldRows = Math.ceil(subFieldsWithValues / 2);
            height += subFieldRows * 8; // 8mm por linha de campos em submódulos
            height += 5; // Espaçamento extra para submódulo
        });
        
        // Espaçamento mínimo entre blocos
        height += 5;
        
        return height;
    }

    // Adicionar bloco ao PDF
    async addBlockToPDF(pdf, block, startY, margin, contentWidth) {
        let currentY = startY;
        
        // Título do bloco
        const blockTitle = block.querySelector('.block-title');
        const blockNumber = blockTitle.querySelector('.block-number')?.textContent || '';
        const blockText = blockTitle.querySelector('.block-text')?.textContent || blockTitle.textContent;
        const titleTotal = blockTitle.querySelector('.total-input')?.value || '';
        
        pdf.setFontSize(14);
        pdf.setTextColor(18, 35, 66);
        pdf.text(`${blockNumber} - ${blockText}`, margin, currentY);
        
        if (titleTotal && titleTotal !== 'R$ 0,00') {
            pdf.setFontSize(12);
            pdf.text(`Total: ${titleTotal}`, margin + contentWidth - 40, currentY);
        }
        
        currentY += 8;
        
        // Linha separadora
        pdf.setDrawColor(190, 163, 105);
        pdf.setLineWidth(0.2);
        pdf.line(margin, currentY, margin + contentWidth, currentY);
        currentY += 5;
        
        // Campos do bloco
        const formGroups = block.querySelectorAll('.form-group');
        let fieldsPerRow = 0;
        let rowStartY = currentY;
        
        formGroups.forEach((group, index) => {
            const label = group.querySelector('.form-label')?.textContent || '';
            const input = group.querySelector('.form-input');
            const value = input?.value || '';
            
            // Verificar se é o campo de total múltiplos empregados (pode estar oculto)
            const isMultipleTotal = input?.id === 'resumoFinalTotalMultiplo';
            const multipleDiv = document.getElementById('totalMultiplosEmpregados');
            const isVisible = !multipleDiv || multipleDiv.style.display !== 'none';
            
            if (label && value && value !== 'R$ 0,00' && value !== '0,00%' && 
                (!isMultipleTotal || (isMultipleTotal && isVisible))) {
                pdf.setFontSize(9);
                pdf.setTextColor(0, 0, 0);
                
                const fieldWidth = contentWidth / 2 - 5;
                const xPos = margin + (fieldsPerRow % 2) * (fieldWidth + 10);
                
                // Label
                pdf.text(label.substring(0, 35) + (label.length > 35 ? '...' : ''), xPos, rowStartY);
                // Valor
                pdf.setTextColor(18, 35, 66);
                pdf.text(value, xPos, rowStartY + 4);
                
                fieldsPerRow++;
                if (fieldsPerRow % 2 === 0) {
                    rowStartY += 10;
                }
            }
        });
        
        // Ajustar currentY baseado na última linha usada
        if (fieldsPerRow % 2 !== 0) {
            rowStartY += 10;
        }
        
        return rowStartY + 5;
    }

    // Adicionar área de assinatura
    addSignatureArea(pdf, pageHeight, margin, contentWidth, currentY = null) {
        // Se currentY não foi fornecido, usar posição padrão no final da página
        const signatureY = currentY ? currentY + 20 : pageHeight - 40;
        
        // Garantir que não ultrapasse a margem inferior
        const finalY = Math.min(signatureY, pageHeight - 40);
        
        // Quadrado para assinatura digital
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, finalY - 20, 60, 20);
        
        // Texto
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Assinatura Digital:', margin, finalY - 25);
        pdf.text('Data: ___/___/______', margin + 70, finalY - 10);
        
        // Linha para assinatura manual
        pdf.line(margin + 70, finalY, margin + contentWidth, finalY);
        pdf.text('Responsável pela Proposta', margin + 70, finalY + 5);
    }

    // Exportar para CSV
    exportToCSV() {
        try {
            const data = this.collectAllData();
            const csv = this.convertToCSV(data);
            
            const nomeCliente = document.getElementById('nomeCliente')?.value || 'Cliente';
            const dataBase = document.getElementById('dataBase')?.value || new Date().toISOString().split('T')[0];
            const filename = `Calculadora_Terceirizacao_${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}_${dataBase}.csv`;
            
            this.downloadCSV(csv, filename);
            
        } catch (error) {
            console.error('❌ Erro ao gerar CSV:', error);
            alert(`Erro ao gerar CSV: ${error.message}`);
        }
    }

    // Coletar todos os dados do formulário
    collectAllData() {
        const data = {};
        
        // Coletar dados de cada bloco
        const blocks = document.querySelectorAll('.calculation-block');
        
        blocks.forEach((block, blockIndex) => {
            const blockTitle = block.querySelector('.block-title');
            const blockNumber = blockTitle.querySelector('.block-number')?.textContent || (blockIndex + 1);
            
            // Total do bloco (se existir)
            const titleTotal = blockTitle.querySelector('.total-input')?.value;
            if (titleTotal && titleTotal !== 'R$ 0,00') {
                data[`Total Bloco ${blockNumber}`] = titleTotal;
            }
            
            // Campos do bloco
            const formGroups = block.querySelectorAll('.form-group');
            formGroups.forEach(group => {
                const label = group.querySelector('.form-label')?.textContent?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || '';
                const input = group.querySelector('.form-input');
                const value = input?.value || '';
                
                if (label && value && value !== 'R$ 0,00' && value !== '0,00%' && value !== '') {
                    // Limpar o label para ser usado como chave da coluna
                    const cleanLabel = label.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
                    data[cleanLabel] = value;
                }
            });
            
            // Verificar se é o último bloco (Resumo Final) e incluir total múltiplo se aplicável
            if (blockNumber === '9') {
                const totalMultiplosDiv = document.getElementById('totalMultiplosEmpregados');
                const resumoFinalTotalMultiplo = document.getElementById('resumoFinalTotalMultiplo');
                const labelTotalMultiplos = document.getElementById('labelTotalMultiplos');
                
                if (totalMultiplosDiv && totalMultiplosDiv.style.display !== 'none' && 
                    resumoFinalTotalMultiplo && resumoFinalTotalMultiplo.value !== 'R$ 0,00') {
                    const labelText = labelTotalMultiplos?.textContent?.trim() || 'Total para Múltiplos Empregados';
                    data[labelText] = resumoFinalTotalMultiplo.value;
                }
            }
            
            // Coletar campos adicionais importantes para o CSV
            if (blockNumber === '7') {
                // Bloco 7 - Custos Adicionais e Tributos
                const percentualCustosField = document.getElementById('percentualCustosAdicionais');
                const valorCustosField = document.getElementById('valorCustosAdicionais');
                const pisField = document.getElementById('pis');
                const cofinsField = document.getElementById('cofins');
                const issField = document.getElementById('iss');
                const aliquotaSimplesField = document.getElementById('aliquotaSimplesNacional');
                const tributoSimplesField = document.getElementById('tributoSimplesNacional');
                const totalBloco7Field = document.getElementById('totalBloco7');
                
                if (percentualCustosField && percentualCustosField.value) data['Percentual de Custos Adicionais'] = percentualCustosField.value;
                if (valorCustosField && valorCustosField.value && valorCustosField.value !== 'R$ 0,00') data['Valor dos Custos Adicionais'] = valorCustosField.value;
                if (pisField && pisField.value && pisField.value !== 'R$ 0,00') data['PIS'] = pisField.value;
                if (cofinsField && cofinsField.value && cofinsField.value !== 'R$ 0,00') data['COFINS'] = cofinsField.value;
                if (issField && issField.value && issField.value !== 'R$ 0,00') data['ISS'] = issField.value;
                if (aliquotaSimplesField && aliquotaSimplesField.value) data['Alíquota do Simples Nacional'] = aliquotaSimplesField.value;
                if (tributoSimplesField && tributoSimplesField.value && tributoSimplesField.value !== 'R$ 0,00') data['Valor do Tributo Simples Nacional'] = tributoSimplesField.value;
                if (totalBloco7Field && totalBloco7Field.value && totalBloco7Field.value !== 'R$ 0,00') data['Total Bloco 7'] = totalBloco7Field.value;
            }
            
            if (blockNumber === '8') {
                // Bloco 8 - Margem de Lucro
                const percentualMargemField = document.getElementById('percentualMargemLucro');
                const valorTotalComMargemField = document.getElementById('valorTotalComMargem');
                const baseCalculoTributosField = document.getElementById('baseCalculoTributos');
                const valorMargemLucroField = document.getElementById('valorMargemLucro');
                
                if (percentualMargemField && percentualMargemField.value) data['Percentual de Margem de Lucro'] = percentualMargemField.value;
                if (valorTotalComMargemField && valorTotalComMargemField.value && valorTotalComMargemField.value !== 'R$ 0,00') data['Valor Total com Margem'] = valorTotalComMargemField.value;
                if (baseCalculoTributosField && baseCalculoTributosField.value && baseCalculoTributosField.value !== 'R$ 0,00') data['Base de Cálculo para Tributos'] = baseCalculoTributosField.value;
                if (valorMargemLucroField && valorMargemLucroField.value && valorMargemLucroField.value !== 'R$ 0,00') data['Margem de Lucro'] = valorMargemLucroField.value;
            }
            
            if (blockNumber === '6') {
                // Bloco 6 - Resumo do Custo por Empregado - Coletar campos específicos
                const resumoSalarioBrutoField = document.getElementById('resumoSalarioBruto');
                const resumoEncargosField = document.getElementById('resumoEncargos');
                const resumoProvisaoRescisaoField = document.getElementById('resumoProvisaoRescisao');
                const resumoCustosAdicionaisField = document.getElementById('resumoCustosAdicionais');
                const resumoTotalGeralField = document.getElementById('resumoTotalGeral');
                
                // Incluir valores mesmo que sejam R$ 0,00 pois são campos calculados importantes
                if (resumoSalarioBrutoField && resumoSalarioBrutoField.value) {
                    data['Total Salário Bruto do Colaborador'] = resumoSalarioBrutoField.value;
                }
                if (resumoEncargosField && resumoEncargosField.value) {
                    data['Total Encargos e Benefícios Anuais, Mensais e Diários'] = resumoEncargosField.value;
                }
                if (resumoProvisaoRescisaoField && resumoProvisaoRescisaoField.value) {
                    data['Total Provisão para Rescisão'] = resumoProvisaoRescisaoField.value;
                }
                if (resumoCustosAdicionaisField && resumoCustosAdicionaisField.value) {
                    data['Total Benefícios/Despesas Adicionais'] = resumoCustosAdicionaisField.value;
                }
                if (resumoTotalGeralField && resumoTotalGeralField.value) {
                    data['TOTAL GERAL POR EMPREGADO'] = resumoTotalGeralField.value;
                }
            }
            
            if (blockNumber === '9') {
                // Bloco 9 - Resumo Final - Coletar total por empregado
                const resumoFinalTotalGeralField = document.getElementById('resumoFinalTotalGeral');
                if (resumoFinalTotalGeralField && resumoFinalTotalGeralField.value) {
                    data['Total por empregado'] = resumoFinalTotalGeralField.value;
                }
            }
            
            // Submódulos (subtotais)
            const submodules = block.querySelectorAll('.submodule');
            submodules.forEach(submodule => {
                const subTitle = submodule.querySelector('.submodule-title')?.textContent?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || '';
                const subTotal = submodule.querySelector('.subtotal-input')?.value;
                
                if (subTotal && subTotal !== 'R$ 0,00' && subTitle) {
                    // Extrair apenas a parte principal do título do submódulo
                    const cleanSubTitle = subTitle.split(' - ')[1] || subTitle;
                    const finalTitle = `Subtotal ${cleanSubTitle.replace(/Total:.*/, '').trim()}`;
                    data[finalTitle] = subTotal;
                }
            });
        });
        
        return data;
    }

    // Converter dados para formato CSV
    convertToCSV(data) {
        // Lista simples dos campos na ordem exata solicitada
        const headers = [
            'CNPJ',
            'Nome do Cliente', 
            'Responsável pela Proposta',
            'Cargo',
            'Regime Tributário da Empresa',
            'Quantidade',
            'Salário Bruto do Colaborador',
            'Data Base',
            '13º (Décimo-terceiro) Salário',
            '1/3 Férias Proporcionais',
            'Férias Proporcionais',
            'INSS',
            'Salário Educação',
            'SAT (Seguro Acidente de Trabalho)',
            'SESC ou SESI',
            'SENAI - SENAC',
            'SEBRAE',
            'INCRA',
            'FGTS',
            'Valor Passagem Diária (Ida e Volta)',
            'Total Mensal (23 dias)',
            'Desconto Funcionário (6% do Salário Bruto)',
            'Auxílio-Refeição - Valor Diário',
            'Auxílio-Refeição - Total Mensal (23 dias)',
            'Aviso Prévio Indenizado',
            'Incidência do FGTS sobre Aviso Prévio Indenizado',
            'Multa do FGTS sobre Aviso Prévio Indenizado'
        ];

        // Adicionar benefícios/despesas aqui (após "Multa do FGTS" e antes do bloco 6)
        const beneficiosHeaders = [];
        for (let i = 1; i <= 5; i++) {
            const tipoField = document.getElementById(`tipoCusto${i}`);
            const valorField = document.getElementById(`valorCusto${i}`);
            
            if (tipoField && tipoField.value.trim() && valorField && valorField.value.trim() && valorField.value !== 'R$ 0,00') {
                const tipoCusto = tipoField.value.trim();
                beneficiosHeaders.push(`Benefício/Despesa ${i}`);
                beneficiosHeaders.push(`${tipoCusto} R$`);
            }
        }

        // Continuar com bloco 6 e seguintes
        const remainingHeaders = [
            'Total Salário Bruto do Colaborador',
            'Total Encargos e Benefícios Anuais, Mensais e Diários',
            'Total Provisão para Rescisão',
            'Total Benefícios/Despesas Adicionais',
            'Reposição nas férias',
            'Total p/ empregado antes de impostos e margem',
            'Percentual de Custos Adicionais',
            'Valor dos Custos Adicionais',
            'PIS',
            'COFINS',
            'ISS',
            'Alíquota do Simples Nacional',
            'Valor do Tributo Simples Nacional',
            'Percentual de Margem de Lucro',
            'Valor Total com Margem',
            'Base de Cálculo para Tributos',
            'Custos Adicionais e Tributos',
            'Margem de Lucro',
            'Total por empregado'
        ];

        // Combinar todos os headers na ordem correta
        const allHeaders = [...headers, ...beneficiosHeaders, ...remainingHeaders];

        // Valores correspondentes - buscar diretamente nos campos do DOM
        const values = allHeaders.map(header => {
            let value = '';
            
            // Buscar valor nos dados coletados primeiro
            if (data[header]) {
                value = data[header];
            } else {
                // Buscar diretamente nos campos específicos
                switch (header) {
                    case 'Total Salário Bruto do Colaborador':
                        value = document.getElementById('resumoSalarioBruto')?.value || '';
                        break;
                    case 'Total Encargos e Benefícios Anuais, Mensais e Diários':
                        value = document.getElementById('resumoEncargos')?.value || '';
                        break;
                    case 'Total Provisão para Rescisão':
                        value = document.getElementById('resumoProvisaoRescisao')?.value || '';
                        break;
                    case 'Total Benefícios/Despesas Adicionais':
                        value = document.getElementById('resumoCustosAdicionais')?.value || '';
                        break;
                    case 'Reposição nas férias':
                        value = document.getElementById('reposicaoFerias')?.value || '';
                        break;
                    case 'Total p/ empregado antes de impostos e margem':
                        value = document.getElementById('resumoTotalGeral')?.value || '';
                        break;
                    case 'Percentual de Custos Adicionais':
                        value = document.getElementById('percentualCustosAdicionais')?.value || '';
                        break;
                    case 'Valor dos Custos Adicionais':
                        value = document.getElementById('valorCustosAdicionais')?.value || '';
                        break;
                    case 'PIS':
                        value = document.getElementById('pis')?.value || '';
                        break;
                    case 'COFINS':
                        value = document.getElementById('cofins')?.value || '';
                        break;
                    case 'ISS':
                        value = document.getElementById('iss')?.value || '';
                        break;
                    case 'Alíquota do Simples Nacional':
                        value = document.getElementById('aliquotaSimplesNacional')?.value || '';
                        break;
                    case 'Valor do Tributo Simples Nacional':
                        value = document.getElementById('tributoSimplesNacional')?.value || '';
                        break;
                    case 'Percentual de Margem de Lucro':
                        value = document.getElementById('percentualMargemLucro')?.value || '';
                        break;
                    case 'Valor Total com Margem':
                        value = document.getElementById('valorTotalComMargem')?.value || '';
                        break;
                    case 'Base de Cálculo para Tributos':
                        value = document.getElementById('baseCalculoTributos')?.value || '';
                        break;
                    case 'Custos Adicionais e Tributos':
                        value = document.getElementById('resumoFinalCustosTributos')?.value || '';
                        break;
                    case 'Margem de Lucro':
                        value = document.getElementById('valorMargemLucro')?.value || '';
                        break;
                    case 'Total por empregado':
                        value = document.getElementById('resumoFinalTotalGeral')?.value || '';
                        break;
                    case 'Desconto Funcionário (6% do Salário Bruto)':
                        const desconto = document.getElementById('descontoFuncionario')?.value || '';
                        value = desconto ? desconto.replace('R$ ', 'R$ -') : '';
                        break;
                    default:
                        // Para benefícios/despesas, buscar nos campos específicos
                        if (header.startsWith('Benefício/Despesa ')) {
                            const num = header.split(' ')[1];
                            const tipoField = document.getElementById(`tipoCusto${num}`);
                            value = tipoField ? tipoField.value : '';
                        } else if (header.includes(' R$')) {
                            const headerParts = header.split(' R$');
                            const tipoCusto = headerParts[0];
                            // Buscar qual campo tem esse tipo
                            for (let i = 1; i <= 5; i++) {
                                const tipoField = document.getElementById(`tipoCusto${i}`);
                                if (tipoField && tipoField.value.trim() === tipoCusto) {
                                    const valorField = document.getElementById(`valorCusto${i}`);
                                    value = valorField ? valorField.value : '';
                                    break;
                                }
                            }
                        } else {
                            // Manter valor dos dados coletados ou vazio
                            value = '';
                        }
                }
            }
            
            return value || '';
        });

        // Adicionar total múltiplos empregados se aplicável
        const quantidadeField = document.getElementById('quantidade');
        const quantidade = parseInt(quantidadeField?.value) || 1;
        
        if (quantidade > 1) {
            const totalMultiploField = document.getElementById('resumoFinalTotalMultiplo');
            if (totalMultiploField && totalMultiploField.value !== 'R$ 0,00') {
                allHeaders.push(`Total para ${quantidade} Empregados`);
                values.push(totalMultiploField.value);
            }
        }

        // Função para escapar campos CSV
        const escapeCSV = (field) => {
            const str = String(field || '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Gerar CSV
        const headerLine = allHeaders.map(escapeCSV).join(',');
        const valueLine = values.map(escapeCSV).join(',');

        return headerLine + '\n' + valueLine;
    }

    // Download do arquivo CSV
    downloadCSV(csv, filename) {
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// Inicializar aplicação
const calculadora = new CalculadoraTerceirizacao();
const fileExporter = new FileExporter();

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.calculadora = calculadora;
    window.fileExporter = fileExporter;
    window.FormValidator = FormValidator;
}

// Conectar verificação de status dos botões de exportação aos eventos de input
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar listener para todos os inputs que podem afetar a validação
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            // Pequeno delay para permitir que máscaras sejam aplicadas
            setTimeout(() => {
                fileExporter.checkExportButtonsStatus();
            }, 100);
        });
        
        input.addEventListener('change', () => {
            setTimeout(() => {
                fileExporter.checkExportButtonsStatus();
            }, 100);
        });
    });
    
    // Verificação inicial
    setTimeout(() => {
        fileExporter.checkExportButtonsStatus();
    }, 500);
});
