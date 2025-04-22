const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('sesame_pay', 'root', 'bonjour-Dev@2025', {
  host: '8.153.76.114',
  dialect: 'mysql',
  logging: false
});

// 定义用户模型
const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID，主键，唯一，递增'
  },
  user_name: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '用户名称'
  },
  address: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '用户钱包地址'
  },
  safe_account: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '组织安全账户地址'
  },
  user_status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '0-正常,1-注销，2-暂停'
  }
}, {
  tableName: 'user',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义薪资模型
const Payroll = sequelize.define('Payroll', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID，主键，唯一，递增'
  },
  name: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '员工姓名'
  },
  address: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '员工钱包地址'
  },
  safe_account: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '组织安全账户地址'
  },
  base_salary: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '基本工资'
  },
  bonus: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '奖金'
  }
}, {
  tableName: 'payroll',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义工资历史记录模型
const PayrollHistory = sequelize.define('PayrollHistory', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID，主键，唯一，递增'
  },
  employee_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: '员工ID'
  },
  employee_name: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '员工姓名'
  },
  address: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '员工钱包地址'
  },
  safe_account: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '组织安全账户地址'
  },
  base_salary: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '基本工资'
  },
  bonus: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '奖金'
  },
  total: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '总工资'
  },
  payment_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '支付时间'
  },
  transaction_hash: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '交易哈希'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '0-处理中,1-成功,2-失败'
  }
}, {
  tableName: 'payroll_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义待处理交易模型
const PendingTransaction = sequelize.define('PendingTransaction', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID，主键，唯一，递增'
  },
  safe_account: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '组织安全账户地址'
  },
  address: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '收款人钱包地址'
  },
  propose_address: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '交易发起人钱包地址'
  },
  transaction_details: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '交易详细信息，包含每笔交易的金额和说明'
  },
  total: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '交易总金额'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '交易状态：0-待处理,1-已完成,2-失败'
  }
}, {
  tableName: 'pending_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['address', 'safe_account'],
      name: 'uk_address_safe'
    },
    {
      fields: ['safe_account'],
      name: 'idx_safe_account'
    },
    {
      fields: ['propose_address'],
      name: 'idx_propose_address'
    }
  ]
});


// 同步模型到数据库
sequelize.sync();

module.exports = {
  sequelize,
  User,
  Payroll,
  PayrollHistory,
  PendingTransaction
};
