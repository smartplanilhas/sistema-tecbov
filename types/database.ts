export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      modules: {
        Row: { id: string; name: string; description: string | null; active: boolean }
        Insert: { id: string; name: string; description?: string | null; active?: boolean }
        Update: { id?: string; name?: string; description?: string | null; active?: boolean }
        Relationships: []
      }
      plans: {
        Row: {
          id: string; name: string; slug: string; max_users: number
          price_monthly: number | null; price_yearly: number | null
          active: boolean; sort_order: number; created_at: string
        }
        Insert: {
          id?: string; name: string; slug: string; max_users: number
          price_monthly?: number | null; price_yearly?: number | null
          active?: boolean; sort_order?: number; created_at?: string
        }
        Update: {
          id?: string; name?: string; slug?: string; max_users?: number
          price_monthly?: number | null; price_yearly?: number | null
          active?: boolean; sort_order?: number; created_at?: string
        }
        Relationships: []
      }
      plan_modules: {
        Row: { plan_id: string; module_id: string }
        Insert: { plan_id: string; module_id: string }
        Update: { plan_id?: string; module_id?: string }
        Relationships: []
      }
      tenant_subscriptions: {
        Row: {
          id: string; tenant_id: string; plan_id: string | null
          status: 'trial' | 'active' | 'past_due' | 'blocked' | 'cancelled'
          trial_ends_at: string | null
          current_period_start: string | null; current_period_end: string | null
          extra_users: number; notes: string | null
          stripe_customer_id: string | null; stripe_subscription_id: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; tenant_id: string; plan_id?: string | null
          status?: 'trial' | 'active' | 'past_due' | 'blocked' | 'cancelled'
          trial_ends_at?: string | null
          current_period_start?: string | null; current_period_end?: string | null
          extra_users?: number; notes?: string | null
          stripe_customer_id?: string | null; stripe_subscription_id?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; tenant_id?: string; plan_id?: string | null
          status?: 'trial' | 'active' | 'past_due' | 'blocked' | 'cancelled'
          trial_ends_at?: string | null
          current_period_start?: string | null; current_period_end?: string | null
          extra_users?: number; notes?: string | null
          stripe_customer_id?: string | null; stripe_subscription_id?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      tenant_addon_modules: {
        Row: { tenant_id: string; module_id: string; active: boolean }
        Insert: { tenant_id: string; module_id: string; active?: boolean }
        Update: { tenant_id?: string; module_id?: string; active?: boolean }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          name: string | null
          email: string
          whatsapp: string | null
          plan: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          whatsapp?: string | null
          plan?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          whatsapp?: string | null
          plan?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          user_id: string
          whatsapp: string | null
          position: 'proprietario' | 'funcionario' | 'consultor' | 'contador' | 'estudante' | null
          company_size: '1-5' | '6-10' | '10-30' | '30-50' | '50-100' | '100+' | null
          created_at: string
        }
        Insert: {
          user_id: string
          whatsapp?: string | null
          position?: 'proprietario' | 'funcionario' | 'consultor' | 'contador' | 'estudante' | null
          company_size?: '1-5' | '6-10' | '10-30' | '30-50' | '50-100' | '100+' | null
          created_at?: string
        }
        Update: {
          user_id?: string
          whatsapp?: string | null
          position?: 'proprietario' | 'funcionario' | 'consultor' | 'contador' | 'estudante' | null
          company_size?: '1-5' | '6-10' | '10-30' | '30-50' | '50-100' | '100+' | null
          created_at?: string
        }
        Relationships: []
      }
      tecbov_admins: {
        Row: { user_id: string; name: string; email: string; added_at: string }
        Insert: { user_id: string; name: string; email: string; added_at?: string }
        Update: { user_id?: string; name?: string; email?: string; added_at?: string }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          plan: string
          parent_id: string | null
          short_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: string
          parent_id?: string | null
          short_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: string
          parent_id?: string | null
          short_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          id: string
          tenant_id: string
          module: string
          severity: 'info' | 'warning' | 'error' | 'critical'
          title: string
          message: string | null
          link: string | null
          read: boolean
          resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          module: string
          severity?: 'info' | 'warning' | 'error' | 'critical'
          title: string
          message?: string | null
          link?: string | null
          read?: boolean
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          module?: string
          severity?: 'info' | 'warning' | 'error' | 'critical'
          title?: string
          message?: string | null
          link?: string | null
          read?: boolean
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          role: 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          role?: 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          role?: 'admin' | 'member'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'memberships_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          id: string
          tenant_id: string
          code: string
          name: string
          type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
          parent_id: string | null
          level: number
          sort_order: number
          is_group: boolean
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          code?: string
          name: string
          type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
          parent_id?: string | null
          level?: number
          sort_order?: number
          is_group?: boolean
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          code?: string
          name?: string
          type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
          parent_id?: string | null
          level?: number
          sort_order?: number
          is_group?: boolean
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chart_of_accounts_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      cost_centers: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cost_centers_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      financial_accounts: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT'
          bank: string | null
          balance: number
          is_default: boolean
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT'
          bank?: string | null
          balance?: number
          is_default?: boolean
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: 'CHECKING' | 'SAVINGS' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT'
          bank?: string | null
          balance?: number
          is_default?: boolean
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'financial_accounts_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          tenant_id: string
          number: number
          account_id: string | null
          category_id: string | null
          cost_center_id: string | null
          person_id: string | null
          payment_method_id: string | null
          reference_document: string | null
          recurrence_id: string | null
          transfer_id: string | null
          type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
          amount: number
          date: string
          due_date: string | null
          payment_date: string | null
          description: string | null
          status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          number?: number
          account_id?: string | null
          category_id?: string | null
          cost_center_id?: string | null
          person_id?: string | null
          payment_method_id?: string | null
          reference_document?: string | null
          recurrence_id?: string | null
          transfer_id?: string | null
          type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
          amount: number
          date: string
          due_date?: string | null
          payment_date?: string | null
          description?: string | null
          status?: 'PENDING' | 'COMPLETED' | 'CANCELLED'
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          number?: number
          account_id?: string | null
          category_id?: string | null
          cost_center_id?: string | null
          person_id?: string | null
          payment_method_id?: string | null
          reference_document?: string | null
          recurrence_id?: string | null
          transfer_id?: string | null
          type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
          amount?: number
          date?: string
          due_date?: string | null
          payment_date?: string | null
          description?: string | null
          status?: 'PENDING' | 'COMPLETED' | 'CANCELLED'
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'financial_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      payables: {
        Row: {
          id: string
          tenant_id: string
          supplier: string
          description: string | null
          amount: number
          due_date: string
          paid_date: string | null
          status: 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELLED'
          transaction_id: string | null
          cost_center_id: string | null
          category_id: string | null
          recurrence_id: string | null
          person_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          supplier: string
          description?: string | null
          amount: number
          due_date: string
          paid_date?: string | null
          status?: 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELLED'
          transaction_id?: string | null
          cost_center_id?: string | null
          category_id?: string | null
          recurrence_id?: string | null
          person_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          supplier?: string
          description?: string | null
          amount?: number
          due_date?: string
          paid_date?: string | null
          status?: 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELLED'
          transaction_id?: string | null
          cost_center_id?: string | null
          category_id?: string | null
          recurrence_id?: string | null
          person_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payables_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      payment_methods: {
        Row: {
          id: string
          tenant_id: string
          name: string
          financial_account_id: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          financial_account_id?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          financial_account_id?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_methods_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_methods_financial_account_id_fkey'
            columns: ['financial_account_id']
            isOneToOne: false
            referencedRelation: 'financial_accounts'
            referencedColumns: ['id']
          },
        ]
      }
      receivables: {
        Row: {
          id: string
          tenant_id: string
          customer: string
          description: string | null
          amount: number
          due_date: string
          received_date: string | null
          status: 'OPEN' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED'
          transaction_id: string | null
          category_id: string | null
          recurrence_id: string | null
          person_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          customer: string
          description?: string | null
          amount: number
          due_date: string
          received_date?: string | null
          status?: 'OPEN' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED'
          transaction_id?: string | null
          category_id?: string | null
          recurrence_id?: string | null
          person_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          customer?: string
          description?: string | null
          amount?: number
          due_date?: string
          received_date?: string | null
          status?: 'OPEN' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED'
          transaction_id?: string | null
          category_id?: string | null
          recurrence_id?: string | null
          person_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'receivables_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      recurrences: {
        Row: {
          id: string
          tenant_id: string
          type: 'PAYABLE' | 'RECEIVABLE'
          description: string
          amount: number
          frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY'
          interval: number
          start_date: string
          end_date: string | null
          max_occurrences: number | null
          person_id: string | null
          category_id: string | null
          cost_center_id: string | null
          financial_account_id: string | null
          payment_method_id: string | null
          active: boolean
          last_generated_date: string | null
          total_generated: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: 'PAYABLE' | 'RECEIVABLE'
          description: string
          amount: number
          frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY'
          interval?: number
          start_date: string
          end_date?: string | null
          max_occurrences?: number | null
          person_id?: string | null
          category_id?: string | null
          cost_center_id?: string | null
          financial_account_id?: string | null
          payment_method_id?: string | null
          active?: boolean
          last_generated_date?: string | null
          total_generated?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: 'PAYABLE' | 'RECEIVABLE'
          description?: string
          amount?: number
          frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY'
          interval?: number
          start_date?: string
          end_date?: string | null
          max_occurrences?: number | null
          person_id?: string | null
          category_id?: string | null
          cost_center_id?: string | null
          financial_account_id?: string | null
          payment_method_id?: string | null
          active?: boolean
          last_generated_date?: string | null
          total_generated?: number
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recurrences_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      people: {
        Row: {
          id: string
          tenant_id: string
          is_client: boolean
          is_supplier: boolean
          name: string
          document: string | null
          trade_name: string | null
          contact_name: string | null
          phone: string | null
          email: string | null
          zip_code: string | null
          state: string | null
          city: string | null
          address: string | null
          address_number: string | null
          complement: string | null
          neighborhood: string | null
          state_registration: string | null
          municipal_registration: string | null
          birth_date: string | null
          notes: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          is_client?: boolean
          is_supplier?: boolean
          name: string
          document?: string | null
          trade_name?: string | null
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          zip_code?: string | null
          state?: string | null
          city?: string | null
          address?: string | null
          address_number?: string | null
          complement?: string | null
          neighborhood?: string | null
          state_registration?: string | null
          municipal_registration?: string | null
          birth_date?: string | null
          notes?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          is_client?: boolean
          is_supplier?: boolean
          name?: string
          document?: string | null
          trade_name?: string | null
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          zip_code?: string | null
          state?: string | null
          city?: string | null
          address?: string | null
          address_number?: string | null
          complement?: string | null
          neighborhood?: string | null
          state_registration?: string | null
          municipal_registration?: string | null
          birth_date?: string | null
          notes?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'people_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      fazendas: {
        Row: {
          id: string; tenant_id: string; nome: string
          municipio: string | null; estado: string | null
          area_total: number | null; ativa: boolean; created_at: string
        }
        Insert: {
          id?: string; tenant_id: string; nome: string
          municipio?: string | null; estado?: string | null
          area_total?: number | null; ativa?: boolean; created_at?: string
        }
        Update: {
          id?: string; tenant_id?: string; nome?: string
          municipio?: string | null; estado?: string | null
          area_total?: number | null; ativa?: boolean; created_at?: string
        }
        Relationships: []
      }
      racas: {
        Row: {
          id: string; tenant_id: string | null; nome: string; ativa: boolean; created_at: string
        }
        Insert: { id?: string; tenant_id?: string | null; nome: string; ativa?: boolean; created_at?: string }
        Update: { id?: string; tenant_id?: string | null; nome?: string; ativa?: boolean; created_at?: string }
        Relationships: []
      }
      categorias_animal: {
        Row: {
          id: string; tenant_id: string | null; nome: string
          sexo: 'M' | 'F' | null; ordem: number; created_at: string
        }
        Insert: {
          id?: string; tenant_id?: string | null; nome: string
          sexo?: 'M' | 'F' | null; ordem?: number; created_at?: string
        }
        Update: {
          id?: string; tenant_id?: string | null; nome?: string
          sexo?: 'M' | 'F' | null; ordem?: number; created_at?: string
        }
        Relationships: []
      }
      locais: {
        Row: {
          id: string; tenant_id: string; fazenda_id: string | null
          nome: string; tipo: string | null; area_ha: number | null
          sistema: string | null; status: 'ativo' | 'inativo'
          observacoes: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; tenant_id: string; fazenda_id?: string | null
          nome: string; tipo?: string | null; area_ha?: number | null
          sistema?: string | null; status?: 'ativo' | 'inativo'
          observacoes?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; tenant_id?: string; fazenda_id?: string | null
          nome?: string; tipo?: string | null; area_ha?: number | null
          sistema?: string | null; status?: 'ativo' | 'inativo'
          observacoes?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      lotes: {
        Row: {
          id: string; tenant_id: string; fazenda_id: string | null
          nome: string; descricao: string | null
          fase: string | null; meta_peso: number | null
          data_prevista_saida: string | null
          status: 'ativo' | 'encerrado'
          observacoes: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; tenant_id: string; fazenda_id?: string | null
          nome: string; descricao?: string | null
          fase?: string | null; meta_peso?: number | null
          data_prevista_saida?: string | null
          status?: 'ativo' | 'encerrado'
          observacoes?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; tenant_id?: string; fazenda_id?: string | null
          nome?: string; descricao?: string | null
          fase?: string | null; meta_peso?: number | null
          data_prevista_saida?: string | null
          status?: 'ativo' | 'encerrado'
          observacoes?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      animals: {
        Row: {
          id: string; tenant_id: string; fazenda_id: string | null
          categoria_id: string | null; sexo: 'M' | 'F'
          brinco: string | null; identificador: string | null
          sisbov: string | null; registro: string | null; rfid: string | null
          nome: string | null; raca_id: string | null
          origem: 'compra' | 'nascimento' | 'transferencia' | null
          status: 'ativo' | 'vendido' | 'morto' | 'transferido'
          lote_atual_id: string | null; local_atual_id: string | null
          data_nascimento: string | null; data_compra: string | null
          data_entrada: string | null; data_saida: string | null; data_desmama: string | null
          pai_id: string | null; mae_id: string | null; proprietario_id: string | null
          pelagem: string | null; observacoes: string | null
          peso_atual: number | null; data_peso_atual: string | null
          gmd_ultimo: number | null; gmd_geral: number | null; total_pesagens: number
          created_at: string
        }
        Insert: {
          id?: string; tenant_id: string; fazenda_id?: string | null
          categoria_id?: string | null; sexo: 'M' | 'F'
          brinco?: string | null; identificador?: string | null
          sisbov?: string | null; registro?: string | null; rfid?: string | null
          nome?: string | null; raca_id?: string | null
          origem?: 'compra' | 'nascimento' | 'transferencia' | null
          status?: 'ativo' | 'vendido' | 'morto' | 'transferido'
          lote_atual_id?: string | null; local_atual_id?: string | null
          data_nascimento?: string | null; data_compra?: string | null
          data_entrada?: string | null; data_saida?: string | null; data_desmama?: string | null
          pai_id?: string | null; mae_id?: string | null; proprietario_id?: string | null
          pelagem?: string | null; observacoes?: string | null
          peso_atual?: number | null; data_peso_atual?: string | null
          gmd_ultimo?: number | null; gmd_geral?: number | null; total_pesagens?: number
          created_at?: string
        }
        Update: {
          id?: string; tenant_id?: string; fazenda_id?: string | null
          categoria_id?: string | null; sexo?: 'M' | 'F'
          brinco?: string | null; identificador?: string | null
          sisbov?: string | null; registro?: string | null; rfid?: string | null
          nome?: string | null; raca_id?: string | null
          origem?: 'compra' | 'nascimento' | 'transferencia' | null
          status?: 'ativo' | 'vendido' | 'morto' | 'transferido'
          lote_atual_id?: string | null; local_atual_id?: string | null
          data_nascimento?: string | null; data_compra?: string | null
          data_entrada?: string | null; data_saida?: string | null; data_desmama?: string | null
          pai_id?: string | null; mae_id?: string | null; proprietario_id?: string | null
          pelagem?: string | null; observacoes?: string | null
          peso_atual?: number | null; data_peso_atual?: string | null
          gmd_ultimo?: number | null; gmd_geral?: number | null; total_pesagens?: number
          created_at?: string
        }
        Relationships: []
      }
      pesagens: {
        Row: {
          id: string; tenant_id: string; animal_id: string
          peso: number; data: string
          tipo: 'entrada' | 'controle' | 'saida'
          observacoes: string | null; created_at: string
        }
        Insert: {
          id?: string; tenant_id: string; animal_id: string
          peso: number; data: string
          tipo?: 'entrada' | 'controle' | 'saida'
          observacoes?: string | null; created_at?: string
        }
        Update: {
          id?: string; tenant_id?: string; animal_id?: string
          peso?: number; data?: string
          tipo?: 'entrada' | 'controle' | 'saida'
          observacoes?: string | null; created_at?: string
        }
        Relationships: []
      }
      proprietarios: {
        Row: { id: string; tenant_id: string; nome: string; created_at: string }
        Insert: { id?: string; tenant_id: string; nome: string; created_at?: string }
        Update: { id?: string; tenant_id?: string; nome?: string; created_at?: string }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          id: string; tenant_id: string; animal_id: string
          tipo: 'entrada' | 'saida' | 'mudanca_lote' | 'mudanca_local' | 'mudanca_lote_local'
          lote_anterior_id: string | null; local_anterior_id: string | null
          lote_novo_id: string | null; local_novo_id: string | null
          data: string; grupo_id: string | null
          motivo: string | null; observacoes: string | null; created_at: string
        }
        Insert: {
          id?: string; tenant_id: string; animal_id: string
          tipo: 'entrada' | 'saida' | 'mudanca_lote' | 'mudanca_local' | 'mudanca_lote_local'
          lote_anterior_id?: string | null; local_anterior_id?: string | null
          lote_novo_id?: string | null; local_novo_id?: string | null
          data: string; grupo_id?: string | null
          motivo?: string | null; observacoes?: string | null; created_at?: string
        }
        Update: {
          id?: string; tenant_id?: string; animal_id?: string
          tipo?: 'entrada' | 'saida' | 'mudanca_lote' | 'mudanca_local' | 'mudanca_lote_local'
          lote_anterior_id?: string | null; local_anterior_id?: string | null
          lote_novo_id?: string | null; local_novo_id?: string | null
          data?: string; grupo_id?: string | null
          motivo?: string | null; observacoes?: string | null; created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      user_tenant_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
      is_tenant_admin: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      create_coa_account: {
        Args: {
          p_tenant_id: string
          p_name: string
          p_type: string
          p_parent_id?: string | null
          p_is_group?: boolean
        }
        Returns: Database['public']['Tables']['chart_of_accounts']['Row']
      }
      move_coa_account: {
        Args: {
          p_account_id: string
          p_new_parent_id: string | null
          p_before_id?: string | null
        }
        Returns: void
      }
      archive_coa_account: {
        Args: { p_account_id: string }
        Returns: void
      }
      unarchive_coa_account: {
        Args: { p_account_id: string }
        Returns: void
      }
      delete_coa_account: {
        Args: { p_account_id: string }
        Returns: void
      }
      fn_animal_estado_em: {
        Args: { p_animal_id: string; p_data: string }
        Returns: { lote_id: string | null; local_id: string | null }[]
      }
      fn_animais_em_lote_em: {
        Args: { p_lote_id: string; p_data: string }
        Returns: { animal_id: string }[]
      }
      fn_animais_em_local_em: {
        Args: { p_local_id: string; p_data: string }
        Returns: { animal_id: string }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tenant = Database['public']['Tables']['tenants']['Row']
export type Membership = Database['public']['Tables']['memberships']['Row']
export type ChartOfAccount = Database['public']['Tables']['chart_of_accounts']['Row']
export type CostCenter = Database['public']['Tables']['cost_centers']['Row']
export type FinancialAccount = Database['public']['Tables']['financial_accounts']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Payable = Database['public']['Tables']['payables']['Row']
export type Receivable = Database['public']['Tables']['receivables']['Row']
export type Person = Database['public']['Tables']['people']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type Recurrence = Database['public']['Tables']['recurrences']['Row']
