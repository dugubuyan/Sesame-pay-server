const { Sequelize } = require('sequelize');
const express = require('express');
const cors = require('cors');
const { User, Payroll, PayrollHistory, PendingTransaction, sequelize } = require('./app');
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

// 获取历史记录
app.get('/api/history', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const user = await User.findOne({ where: { address: walletAddress } });
    const transactions = await PayrollHistory.findAll({
      where: { safe_account: user.safe_account },
      order: [['payment_time', 'DESC']]
    });
    res.json({ success: true, data: { transactions } });
  } catch (error) {
    logger.error('[/api/history] Error: %s', error);
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
    const { walletAddress, safeAddress } = req.body;
    // 更新特定用户的安全账户地址
    const user = await User.findOne({ where: { address: walletAddress } });
    if (!user) {
      return res.status(404).json({ success: false, message: '未找到该用户' });
    }
    const result = await User.update(
      { safe_account: safeAddress },
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
    const { walletAddress, safeAccount, total, transactionDetails, transaction_hash } = req.body;
    
    // 查找同一组织的其他用户
    const otherUsers = await User.findAll({
      where: {
        safe_account: safeAccount,
        address: {
          [Sequelize.Op.ne]: walletAddress
        }
      }
    });

    // 为每个其他用户创建待处理交易记录
    const transactions = await Promise.all(otherUsers.map(user =>
      PendingTransaction.create({
        safe_account: safeAccount,
        address: user.address,
        propose_address: walletAddress,
        total: total,
        transaction_details: transactionDetails,
        transaction_hash: transaction_hash,
        status: 0 // 待处理状态
      })
    ));

    res.json({
      success: true,
      data: {
        id: transactions[0]?.id,
        status: 'pending',
        transaction_hash: ''
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
    const { walletAddress,id,status } = req.body;

    const transaction = await PendingTransaction.findOne({
      where: {
        id,
        address: walletAddress
      }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: '未找到该交易或无权限更新' });
    }

    await transaction.update({
      status: status === 'completed' ? 1 : status === 'failed' ? 2 : 0
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
        safeAccount: user.safe_account || ''
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

// 获取待处理交易列表
app.get('/api/pending-transactions', authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.query;
    const user = await User.findOne({ where: { address: walletAddress } });
    
    const transactions = await PendingTransaction.findAll({
      where: { 
        safe_account: user.safe_account,
        address: walletAddress,
        status: 0 // 只获取待处理状态的交易
      },
      attributes: ['id', 'status', 'total', 'safe_account', 'propose_address', 'transaction_details', 'transaction_hash', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: { transactions } });
  } catch (error) {
    logger.error('[/api/pending-transactions] Error: %s', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 保存工资发放历史记录
app.post('/api/payroll/history', authMiddleware, async (req, res) => {
  let t;
  try {
    const { walletAddress, transactionData } = req.body;
    if (!transactionData || !transactionData.transactionDetails || !Array.isArray(transactionData.transactionDetails)) {
      return res.status(400).json({ success: false, message: '无效的交易数据格式' });
    }

    const { safeAccount, transactionDetails, transaction_hash, payment_time } = transactionData;
    if (!safeAccount || !transaction_hash || !payment_time) {
      return res.status(400).json({ success: false, message: '缺少必要的交易信息' });
    }

    t = await sequelize.transaction();

    // 批量创建工资发放历史记录
    const historyRecords = transactionDetails.map(detail => ({
      employee_name: detail.name || '',
      address: detail.address || '',
      safe_account: safeAccount,
      base_salary: Number(detail.base) || 0,
      bonus: Number(detail.bonus) || 0,
      total: Number(detail.total) || 0,
      payment_time: payment_time,
      transaction_hash: transaction_hash,
      status: 0 // 处理中状态
    }));

    const records = await PayrollHistory.bulkCreate(historyRecords, { 
      transaction: t,
      validate: true
    });
    
    await t.commit();
    logger.info('[/api/payroll/history] Successfully created %d records for safe account %s', records.length, safeAccount);

    res.json({
      success: true,
      data: {
        id: records[0]?.id,
        status: 'processing',
        propose_address: walletAddress,
        total: historyRecords.reduce((sum, record) => sum + Number(record.total), 0),
        transaction_hash: transaction_hash,
        created_at: records[0]?.created_at
      }
    });
  } catch (error) {
    logger.error('[/api/payroll/history] Error: %s', error);
    if (t) await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = 30001;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});