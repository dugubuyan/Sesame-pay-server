const { Sequelize } = require('sequelize');
const express = require('express');
const cors = require('cors');
const { User, Payroll, Transaction, sequelize } = require('./app');
const { logger, requestLogger } = require('./logger');

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger); // 添加请求日志中间件

// 认证中间件
const authMiddleware = (req, res, next) => {
  const authToken = req.headers['auth-token'];
  const requestWalletAddress = req.body.walletAddress || req.query.walletAddress;

  if (!authToken || !requestWalletAddress) {
    return res.status(403).json({ success: false, message: '未提供认证信息' });
  }

  // 解码authToken（base64编码的钱包地址）
  const decodedWalletAddress = Buffer.from(authToken, 'base64').toString();
  
  if (decodedWalletAddress !== requestWalletAddress) {
    logger.error('[/api/*] AuthToken不匹配: %s, %s', decodedWalletAddress, requestWalletAddress);
    return res.status(403).json({ success: false, message: '认证信息不匹配' });
  }

  next();
};

// 登录接口
app.post('/api/login', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    let user = await User.findOne({ where: { address: walletAddress } });
    if (!user) {
      user = await User.create({ address: walletAddress });
    }
    const authToken = Buffer.from(walletAddress).toString('base64');
    res.json({ success: true, data: { authToken } });
  } catch (error) {
    logger.error('[/api/login] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 仪表盘数据
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const user = await User.findOne({ where: { address: walletAddress } });
    const totalEmployees = await Payroll.count({ where: { safe_account: user.safe_account } });
    const totalPayroll = await Payroll.sum(
      'base_salary',
      { where: { safe_account: user.safe_account } }
    ) + await Payroll.sum(
      'bonus',
      { where: { safe_account: user.safe_account } }
    ) || 0;
    res.json({
      success: true,
      data: {
        totalEmployees,
        totalPayroll,
        safeAccount: user.safe_account
      }
    });
  } catch (error) {
    logger.error('[/api/dashboard] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取工资表
app.get('/api/payroll', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const user = await User.findOne({ where: { address: walletAddress } });
    const employees = await Payroll.findAll({ 
      where: { safe_account: user.safe_account },
      attributes: [
        'id',
        'name',
        'address',
        ['base_salary', 'baseSalary'],
        'bonus',
        [Payroll.sequelize.literal('base_salary + bonus'), 'total']
      ]
    });
    res.json({ success: true, data: { employees } });
  } catch (error) {
    logger.error('[/api/payroll] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取成员列表
app.get('/api/members', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const user = await User.findOne({ where: { address: walletAddress } });
    const members = await User.findAll({ where: { safe_account: user.safe_account } });
    res.json({ success: true, data: { members } });
  } catch (error) {
    logger.error('[/api/members] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 保存员工信息
app.post('/api/employee', authMiddleware, async (req, res) => {
  try {
    const { walletAddress, employeeData } = req.body;
    const user = await User.findOne({ where: { address: walletAddress } });
    
    if (employeeData.id) {
      // 更新操作
      const employee = await Payroll.findOne({
        where: { 
          id: employeeData.id,
          safe_account: user.safe_account
        }
      });
      
      if (!employee) {
        return res.status(404).json({ success: false, message: '未找到该员工或无权限更新' });
      }
      
      await Payroll.update({
        name: employeeData.name,
        address: employeeData.address,
        base_salary: Number(employeeData.baseSalary) || 0,
        bonus: Number(employeeData.bonus) || 0
      }, {
        where: { 
          id: employeeData.id,
          safe_account: user.safe_account
        }
      });
      
      res.json({ success: true, data: { id: employeeData.id } });
    } else {
      // 新增操作
      const employee = await Payroll.create({
        name: employeeData.name,
        address: employeeData.address,
        base_salary: Number(employeeData.baseSalary) || 0,
        bonus: Number(employeeData.bonus) || 0,
        safe_account: user.safe_account
      });
      res.json({ success: true, data: { id: employee.id } });
    }
  } catch (error) {
    logger.error('[/api/employee] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 保存安全账户
app.post('/api/safe-account', authMiddleware, async (req, res) => {
  try {
    const { walletAddress, safeAddress, signers } = req.body;
    // 更新特定用户的安全账户地址和角色
    const user = await User.findOne({ where: { address: walletAddress } });
    if (!user) {
      return res.status(404).json({ success: false, message: '未找到该用户' });
    }
    
    // 如果用户在签名者列表中，设置为signer角色
    const role = signers.includes(walletAddress) ? 'signer' : 'worker';
    
    const result = await User.update(
      { 
        safe_account: safeAddress,
        role: role 
      },
      { where: { address: walletAddress, safe_account: user.safe_account } }
    );
    
    if (result[0] === 0) {
      return res.status(400).json({ success: false, message: '更新失败' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('[/api/safe-account] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建待处理交易

app.post('/api/pending-transaction', authMiddleware, async (req, res) => {
  try {
    const { safeAccount, chainId, transactionDetails, transactionHash, proposeAddress, total } = req.body;
    
    // 打印所有接收到的参数
    logger.info('[/api/pending-transaction] Parameters: safeAccount: %s, chainId: %s, transactionDetails: %s, transactionHash: %s, proposeAddress: %s, total: %s',
      safeAccount,
      chainId,
      JSON.stringify(transactionDetails),
      transactionHash,
      proposeAddress,
      total
    );
    const transaction = await Transaction.create({
      safe_account: safeAccount,
      chain_id: chainId,
      propose_address: proposeAddress,
      transaction_details: transactionDetails,
      total: total,
      transaction_hash: transactionHash
    });
    res.json({ 
      success: true, 
      data: { 
        id: transaction.id,
        status: transaction.status,
        propose_address: transaction.propose_address,
        total: transaction.total,
        transaction_hash: transaction.transaction_hash
      } 
    });
  } catch (error) {
    logger.error('[/api/pending-transaction] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新待处理交易状态
app.post('/api/pending-transaction/update', authMiddleware, async (req, res) => {
  try {
    const { walletAddress,transaction_hash,status } = req.body;

    const transaction = await Transaction.findOne({
      where: {
        transaction_hash
      }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: '未找到该交易或无权限更新' });
    }

    await transaction.update({
      status: status
    });

    res.json({
      success: true,
      data: {
        id: transaction.id,
        status: status
      }
    });
  } catch (error) {
    logger.error('[/api/pending-transaction/update] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除员工信息
app.delete('/api/employee/:id', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const { id } = req.params;
    const user = await User.findOne({ where: { address: walletAddress } });

    
    // 验证员工是否属于该组织
    const employee = await Payroll.findOne({
      where: { 
        id: id,
        safe_account: user.safe_account
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: '未找到该员工或无权限删除' });
    }

    // 删除员工记录
    await employee.destroy();
    res.json({ success: true });
  } catch (error) {
    logger.error('[/api/employee] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取用户信息
app.get('/api/user', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const user = await User.findOne({ where: { address: walletAddress } });
    if (!user) {
      return res.status(404).json({ success: false, message: '未找到该用户' });
    }
    res.json({
      success: true,
      data: {
        userName: user.user_name || '',
        safeAccount: user.safe_account || '',
        role: user.role || 'worker'  // 添加role字段到返回数据中
      }
    });
  } catch (error) {
    logger.error('[/api/user] GET Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新用户信息
app.put('/api/user', authMiddleware, async (req, res) => {
  try {
    const { walletAddress, userName } = req.body;
    const user = await User.findOne({ where: { address: walletAddress } });
    if (!user) {
      return res.status(404).json({ success: false, message: '未找到该用户' });
    }
    await User.update(
      { user_name: userName },
      { where: { address: walletAddress } }
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('[/api/user] PUT Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取交易列表
app.get('/api/pending-transactions', authMiddleware, async (req, res) => {
  try {
    const { walletAddress, status } = req.query;
    const user = await User.findOne({ where: { address: walletAddress } });
    
    const transactions = await Transaction.findAll({
      where: { 
        safe_account: user.safe_account,
        status: status 
      },
      attributes: ['id', 'status', 'total', 'safe_account', 'propose_address', 'transaction_details', 'transaction_hash', 'updated_at'],
      order: [['updated_at', 'DESC']]
    });

    // 获取所有交易中涉及的propose_address
    const proposeAddresses = transactions.map(t => t.propose_address);
    
    // 批量查询这些地址对应的用户信息
    const users = await User.findAll({
      where: {
        address: proposeAddresses
      },
      attributes: ['address', 'user_name']
    });

    // 创建地址到用户名的映射
    const addressToUsername = {};
    users.forEach(user => {
      if (user.user_name) {
        addressToUsername[user.address] = user.user_name;
      }
    });

    // 处理交易列表，添加proposer字段（如果有对应的user_name）
    const processedTransactions = transactions.map(transaction => {
      const transactionData = transaction.toJSON();
      if (addressToUsername[transactionData.propose_address]) {
        transactionData.proposer = addressToUsername[transactionData.propose_address];
      }
      return transactionData;
    });

    res.json({ success: true, data: { transactions: processedTransactions } });
  } catch (error) {
    logger.error('[/api/pending-transactions] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = 30001;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});