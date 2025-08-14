import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function populateData() {
  try {
    console.log('🔄 Starting data population...');

    // Check if data already exists
    const existingUsers = await pool.query('SELECT COUNT(*) FROM users');
    const existingCases = await pool.query('SELECT COUNT(*) FROM cases');
    const existingEmployees = await pool.query('SELECT COUNT(*) FROM employees');

    console.log('📊 Current data:', {
      users: existingUsers.rows[0].count,
      cases: existingCases.rows[0].count,
      employees: existingEmployees.rows[0].count
    });

    // Insert admin user if not exists
    if (parseInt(existingUsers.rows[0].count) === 0) {
      console.log('👤 Creating admin user...');
      await pool.query(`
        INSERT INTO users (id, username, email, password, "firstName", "lastName", role, permissions) 
        VALUES (
          'admin-id',
          'admin',
          'admin@example.com',
          'abf4dcbb4d3321558df18aa60b7fc90dd0e17634949da3a47cfd2202938b5f4b4164d323772842d56d18a8ffa3f4955df0d5b31e32c3a349be930b58e91ceb3b.054755060135b94caaeea4f9ae9a1b0b',
          'Admin',
          'User',
          'admin',
          '{"matricula":{"view":true,"edit":true},"nome":{"view":true,"edit":true},"processo":{"view":true,"edit":true},"prazoEntrega":{"view":true,"edit":true},"audiencia":{"view":true,"edit":true},"status":{"view":true,"edit":true},"dataEntrega":{"view":true,"edit":true},"dashboard":{"view":true},"cases":{"view":true,"edit":true,"create":true,"delete":true},"employees":{"view":true,"edit":true,"create":true,"delete":true},"users":{"view":true,"edit":true,"create":true,"delete":true},"activity_logs":{"view":true}}'::jsonb
        )
        ON CONFLICT (username) DO NOTHING
      `);
      console.log('✅ Admin user created');
    }

    // Insert sample employees if not exists
    if (parseInt(existingEmployees.rows[0].count) === 0) {
      console.log('👥 Creating sample employees...');
      const employees = [
        { empresa: 'BASE FACILITIES', nome: 'João Silva', matricula: 'BF001', rg: '12.345.678-9', pis: '123.45678.90-1', dataAdmissao: '2020-01-15', dataDemissao: null, salario: 5500.00, cargo: 'Analista Jr', centroCusto: '001', departamento: 'TI' },
        { empresa: 'TECH SOLUTIONS', nome: 'Maria Santos', matricula: 'TS002', rg: '98.765.432-1', pis: '987.65432.10-9', dataAdmissao: '2019-03-20', dataDemissao: '2023-12-31', salario: 7200.00, cargo: 'Coordenadora', centroCusto: '002', departamento: 'Recursos Humanos' },
        { empresa: 'INNOVATE CORP', nome: 'Carlos Oliveira', matricula: 'IC003', rg: '11.222.333-4', pis: '111.22333.44-5', dataAdmissao: '2021-06-10', dataDemissao: null, salario: 4800.00, cargo: 'Assistente', centroCusto: '003', departamento: 'Financeiro' },
        { empresa: 'GLOBAL SYSTEMS', nome: 'Ana Costa', matricula: 'GS004', rg: '55.666.777-8', pis: '555.66777.88-9', dataAdmissao: '2022-09-05', dataDemissao: null, salario: 6300.00, cargo: 'Especialista', centroCusto: '004', departamento: 'Marketing' }
      ];

      for (const emp of employees) {
        await pool.query(`
          INSERT INTO employees (empresa, nome, matricula, rg, pis, "dataAdmissao", "dataDemissao", salario, cargo, "centroCusto", departamento)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (matricula) DO NOTHING
        `, [emp.empresa, emp.nome, emp.matricula, emp.rg, emp.pis, emp.dataAdmissao, emp.dataDemissao, emp.salario, emp.cargo, emp.centroCusto, emp.departamento]);
      }
      console.log('✅ Sample employees created');
    }

    // Insert sample cases if not exists
    if (parseInt(existingCases.rows[0].count) === 0) {
      console.log('⚖️ Creating sample cases...');
      const cases = [
        { matricula: 'BF001', "clientName": 'João Silva', "processNumber": 'PROC-2024-001,PROC-2024-007', "dueDate": '2025-08-20', audiencia: '2025-08-18 10:00', status: 'novo', "assignedUserId": 'admin-id' },
        { matricula: 'TS002', "clientName": 'Maria Santos', "processNumber": 'PROC-2024-002', "dueDate": '2025-08-15', audiencia: '2025-08-14 14:30', status: 'pendente', "assignedUserId": 'admin-id' },
        { matricula: 'IC003', "clientName": 'Carlos Oliveira', "processNumber": 'PROC-2024-003,PROC-2024-008', "dueDate": '2025-08-10', audiencia: '2025-08-09 09:00', status: 'atrasado', "assignedUserId": 'admin-id' },
        { matricula: 'GS004', "clientName": 'Ana Costa', "processNumber": 'PROC-2024-004', "dueDate": '2025-07-30', audiencia: '2025-07-28 15:00', status: 'concluido', "assignedUserId": 'admin-id', "dataEntrega": '2025-07-29' },
        { matricula: 'BF001', "clientName": 'João Silva', "processNumber": 'PROC-2024-005', "dueDate": '2025-08-25', audiencia: '2025-08-24 11:00', status: 'pendente', "assignedUserId": 'admin-id' },
        { matricula: 'TS002', "clientName": 'Maria Santos', "processNumber": 'PROC-2024-006', "dueDate": '2025-08-12', audiencia: '2025-08-11 16:00', status: 'novo', "assignedUserId": 'admin-id' },
        { matricula: 'IC003', "clientName": 'Carlos Oliveira', "processNumber": 'PROC-2024-009', "dueDate": '2025-08-18', audiencia: '2025-08-17 13:30', status: 'pendente', "assignedUserId": 'admin-id' },
        { matricula: 'GS004', "clientName": 'Ana Costa', "processNumber": 'PROC-2024-010', "dueDate": '2025-08-22', audiencia: '2025-08-21 10:30', status: 'novo', "assignedUserId": 'admin-id' }
      ];

      for (const case_data of cases) {
        await pool.query(`
          INSERT INTO cases (matricula, "clientName", "processNumber", "dueDate", audiencia, status, "assignedUserId", "dataEntrega")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [case_data.matricula, case_data.clientName, case_data.processNumber, case_data.dueDate, case_data.audiencia, case_data.status, case_data.assignedUserId, case_data.dataEntrega || null]);
      }
      console.log('✅ Sample cases created');
    }

    // Final count
    const finalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const finalCases = await pool.query('SELECT COUNT(*) FROM cases');
    const finalEmployees = await pool.query('SELECT COUNT(*) FROM employees');

    console.log('🎉 Data population completed!');
    console.log('📊 Final data:', {
      users: finalUsers.rows[0].count,
      cases: finalCases.rows[0].count,
      employees: finalEmployees.rows[0].count
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error populating data:', error);
    await pool.end();
    process.exit(1);
  }
}

populateData();