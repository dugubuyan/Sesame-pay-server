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
  role: {
    type: DataTypes.ENUM('signer', 'worker'),
    allowNull: false,
    defaultValue: 'worker',
    comment: '用户角色：signer-签名者,worker-普通成员'
  },
  user_status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '0-正常,1-注销，2-暂停'
  },
  chain_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: '链ID'
  }
}, {
  tableName: 'user',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['address', 'chain_id'],
      name: 'uk_address_chain'
    },
    {
      fields: ['safe_account'],
      name: 'idx_safe_account'
    }
  ]
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
    }
  ]
});

// 定义交易历史模型
const TranHistory = sequelize.define('TranHistory', {
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
  amount: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '支付金额'
  },
  pay_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '支付时间'
  },
  commit_hash: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '提交哈希'
  },
  safe_account: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '组织安全账户地址'
  },
  chain_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: '链ID'
  }
}, {
  tableName: 'tran_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['address'],
      name: 'idx_address'
    },
    {
      fields: ['pay_time'],
      name: 'idx_pay_time'
    }
  ]
});

// 定义交易模型（原 PendingTransaction）
const Transaction = sequelize.define('Transaction', {
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
  },
  transaction_hash: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '交易哈希'
  },
  chain_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: '链ID'
  },
  commit_hash: {
    type: DataTypes.STRING(128),
    allowNull: false,
    defaultValue: '',
    comment: '提交哈希'
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['transaction_hash', 'chain_id'],
      name: 'uk_trans'
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



module.exports = {
  sequelize,
  User,
  Payroll,
  Transaction,
  TranHistory
};
