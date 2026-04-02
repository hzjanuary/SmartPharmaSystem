import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SalesChart from '../components/SalesChart';
import Sidebar from '../components/Sidebar';
import { BACKEND_URL, requestJson } from '../utils/api';
import {
  clearSessionUser,
  fromBackendRole,
  getSessionUser,
  toBackendRole,
} from '../utils/session';
import './RoleWorkspace.css';

const emptySummary = {
  stats: {
    expiring_products: 0,
    new_orders: 0,
    monthly_import: 0,
  },
  chart: {
    labels: [],
    values: [],
    label: 'Số lượng phát sinh theo ngày',
  },
  expiry_alerts: [],
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const downloadFile = (content, fileName, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const csvLine = (values) => values.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',');

const AdminWorkspace = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    username: '',
    password: '',
    role: 'staff',
  });

  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ category_name: '', description: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [summary, setSummary] = useState(emptySummary);
  const [products, setProducts] = useState([]);
  const [importHistory, setImportHistory] = useState([]);

  const [status, setStatus] = useState({ text: '', isError: false });
  const [backupFile, setBackupFile] = useState(null);
  const [isWorking, setIsWorking] = useState(false);

  const currentUser = getSessionUser();

  const roleStats = useMemo(() => {
    const adminCount = users.filter((item) => fromBackendRole(item.role) === 'admin').length;
    const staffCount = users.filter((item) => fromBackendRole(item.role) === 'staff').length;
    return { adminCount, staffCount };
  }, [users]);

  const stockOutReportRows = useMemo(() => {
    const importedByProductId = {};

    importHistory.forEach((row) => {
      const pid = Number(row.product_id || 0);
      if (!pid) return;
      importedByProductId[pid] = (importedByProductId[pid] || 0) + Number(row.quantity || 0);
    });

    return products
      .map((item) => {
        const importedQty = importedByProductId[item.product_id] || 0;
        const currentQty = Number(item.quantity || 0);
        const exportedQty = Math.max(importedQty - currentQty, 0);
        return {
          product_id: item.product_id,
          product_code: item.product_code || '-',
          product_name: item.product_name || '-',
          unit: item.unit || '-',
          importedQty,
          currentQty,
          exportedQty,
        };
      })
      .filter((row) => row.importedQty > 0 || row.exportedQty > 0)
      .sort((a, b) => b.exportedQty - a.exportedQty);
  }, [importHistory, products]);

  const totalEstimatedExported = useMemo(
    () => stockOutReportRows.reduce((sum, row) => sum + Number(row.exportedQty || 0), 0),
    [stockOutReportRows]
  );

  const lowStockRows = useMemo(() => {
    const LOW_STOCK_THRESHOLD = 10;
    return products
      .map((item) => ({
        product_id: item.product_id,
        product_code: item.product_code || '-',
        product_name: item.product_name || '-',
        unit: item.unit || '-',
        quantity: Number(item.quantity || 0),
      }))
      .filter((item) => item.quantity <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.quantity - b.quantity);
  }, [products]);

  const showStatus = (text, isError = false) => {
    setStatus({ text, isError });
  };

  const loadUsers = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/admin`);
      setUsers(Array.isArray(payload) ? payload : []);
    } catch (error) {
      showStatus(`Không thể tải danh sách người dùng: ${error.message}`, true);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/product_category`);
      setCategories(Array.isArray(payload) ? payload : []);
    } catch (error) {
      showStatus(`Không thể tải danh mục: ${error.message}`, true);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/dashboard/summary`);
      setSummary({ ...emptySummary, ...payload });
    } catch (error) {
      showStatus(`Không thể tải thống kê: ${error.message}`, true);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/product`);
      setProducts(Array.isArray(payload) ? payload : []);
    } catch (error) {
      showStatus(`Không thể tải danh sách hàng hóa: ${error.message}`, true);
    }
  }, []);

  const loadImportHistory = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/history_import`);
      setImportHistory(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setImportHistory([]);
      showStatus(`Không thể tải lịch sử nhập kho: ${error.message}`, true);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsWorking(true);
    await Promise.all([loadUsers(), loadCategories(), loadSummary(), loadProducts(), loadImportHistory()]);
    setIsWorking(false);
  }, [loadCategories, loadImportHistory, loadProducts, loadSummary, loadUsers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      clearSessionUser();
      navigate('/login');
    }
  };

  const handleChangeRole = async (userId, role) => {
    try {
      setIsWorking(true);
      await requestJson(`${BACKEND_URL}/api/admin/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role: toBackendRole(role),
        }),
      });
      showStatus('Cập nhật vai trò thành công.');
      await loadUsers();
    } catch (error) {
      showStatus(`Cập nhật vai trò thất bại: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleRegisterUser = async (event) => {
    event.preventDefault();
    try {
      setIsWorking(true);
      await requestJson(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registerForm,
          role: toBackendRole(registerForm.role),
        }),
      });
      setRegisterForm({ full_name: '', username: '', password: '', role: 'staff' });
      showStatus('Tạo tài khoản mới thành công.');
      await loadUsers();
    } catch (error) {
      showStatus(`Không tạo được tài khoản: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user?.user_id) return;

    const isSelf = currentUser?.username && currentUser.username === user.username;
    if (isSelf) {
      showStatus('Bạn không thể xóa tài khoản đang đăng nhập.', true);
      return;
    }

    const shouldDelete = window.confirm(`Xác nhận xóa người dùng ${user.username}?`);
    if (!shouldDelete) return;

    try {
      setIsWorking(true);
      await requestJson(`${BACKEND_URL}/api/admin/${user.user_id}`, {
        method: 'DELETE',
      });
      showStatus('Xóa người dùng thành công.');
      await loadUsers();
    } catch (error) {
      showStatus(`Không thể xóa người dùng: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    const payload = {
      category_name: categoryForm.category_name,
      description: categoryForm.description,
    };

    try {
      setIsWorking(true);
      if (editingCategoryId) {
        await requestJson(`${BACKEND_URL}/api/product_category/${editingCategoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showStatus('Cập nhật danh mục thành công.');
      } else {
        await requestJson(`${BACKEND_URL}/api/product_category`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showStatus('Thêm danh mục thành công.');
      }

      setCategoryForm({ category_name: '', description: '' });
      setEditingCategoryId(null);
      await loadCategories();
    } catch (error) {
      showStatus(`Không lưu được danh mục: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleEditCategory = (item) => {
    setEditingCategoryId(item.category_id);
    setCategoryForm({
      category_name: item.category_name || '',
      description: item.description || '',
    });
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      setIsWorking(true);
      await requestJson(`${BACKEND_URL}/api/product_category/${categoryId}`, {
        method: 'DELETE',
      });
      showStatus('Xóa danh mục thành công.');
      await loadCategories();
    } catch (error) {
      showStatus(`Không xóa được danh mục: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleExportReport = () => {
    const rows = [
      csvLine(['Chỉ số', 'Giá trị']),
      csvLine(['Sản phẩm sắp hết hạn', summary.stats.expiring_products]),
      csvLine(['Đơn hàng mới', summary.stats.new_orders]),
      csvLine(['Nhập kho tháng', summary.stats.monthly_import]),
      csvLine(['Tổng ước tính đã xuất kho', totalEstimatedExported]),
      '',
      csvLine(['Ngày', 'Số lượng']),
      ...(summary.chart.labels || []).map((label, index) => csvLine([label, summary.chart.values?.[index] || 0])),
      '',
      csvLine(['Canh bao ton kho thap', 'So luong', 'Muc do']),
      ...lowStockRows.map((item) =>
        csvLine([`${item.product_code} - ${item.product_name}`, item.quantity, item.quantity === 0 ? 'HET_HANG' : 'SAP_HET'])
      ),
      '',
      csvLine(['Cảnh báo', 'Hạn dùng', 'Mức độ']),
      ...(summary.expiry_alerts || []).map((item) =>
        csvLine([item.product_name, formatDate(item.expiry_date), item.risk_level || 'LOW'])
      ),
    ];

    const fileName = `bao-cao-he-thong-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(rows.join('\n'), fileName, 'text/csv;charset=utf-8;');
    showStatus('Đã xuất báo cáo thống kê (CSV).');
  };

  const handleBackup = async () => {
    try {
      setIsWorking(true);
      const [usersData, categoriesData, productsData, summaryData] = await Promise.all([
        requestJson(`${BACKEND_URL}/api/admin`),
        requestJson(`${BACKEND_URL}/api/product_category`),
        requestJson(`${BACKEND_URL}/api/product`),
        requestJson(`${BACKEND_URL}/api/dashboard/summary`),
      ]);

      const payload = {
        generatedAt: new Date().toISOString(),
        meta: { app: 'SmartPharmaSystem', version: 1 },
        users: usersData,
        categories: categoriesData,
        products: productsData,
        dashboardSummary: summaryData,
      };

      const fileName = `smartpharma-backup-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.json`;
      downloadFile(JSON.stringify(payload, null, 2), fileName, 'application/json;charset=utf-8;');
      showStatus('Sao lưu dữ liệu thành công. File JSON đã được tải xuống.');
    } catch (error) {
      showStatus(`Sao lưu thất bại: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const resolveCategoryId = (product, categoryMapByName, categoryMapById) => {
    if (categoryMapById[product.category_id]) return product.category_id;
    if (product.category_name && categoryMapByName[product.category_name]) {
      return categoryMapByName[product.category_name];
    }
    return null;
  };

  const uploadProduct = async (product, categoryId, existingByCode) => {
    const formData = new FormData();

    formData.append('product_code', product.product_code || '');
    formData.append('product_name', product.product_name || '');
    formData.append('category_id', categoryId || '');
    formData.append('unit', product.unit || '');
    formData.append('purchase_price', product.purchase_price || 0);
    formData.append('selling_price', product.selling_price || 0);
    formData.append('quantity', product.quantity || 0);
    formData.append('expiry_date', product.expiry_date ? String(product.expiry_date).slice(0, 10) : '');
    formData.append('description', product.description || '');
    formData.append('image', product.image || '');

    if (existingByCode) {
      await fetch(`${BACKEND_URL}/api/product/${existingByCode.product_id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });
    } else {
      await fetch(`${BACKEND_URL}/api/product`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
    }
  };

  const handleRestore = async () => {
    if (!backupFile) {
      showStatus('Vui lòng chọn file sao lưu JSON trước khi khôi phục.', true);
      return;
    }

    try {
      setIsWorking(true);
      const text = await backupFile.text();
      const backup = JSON.parse(text);

      const backupCategories = Array.isArray(backup.categories) ? backup.categories : [];
      const backupProducts = Array.isArray(backup.products) ? backup.products : [];
      const backupUsers = Array.isArray(backup.users) ? backup.users : [];

      const liveCategories = await requestJson(`${BACKEND_URL}/api/product_category`);
      const byId = Object.fromEntries((liveCategories || []).map((item) => [item.category_id, item]));
      const byName = Object.fromEntries((liveCategories || []).map((item) => [item.category_name, item.category_id]));

      for (const category of backupCategories) {
        const body = JSON.stringify({
          category_name: category.category_name,
          description: category.description || '',
        });

        if (byId[category.category_id]) {
          await requestJson(`${BACKEND_URL}/api/product_category/${category.category_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body,
          });
        } else {
          await requestJson(`${BACKEND_URL}/api/product_category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });
        }
      }

      const categoriesAfter = await requestJson(`${BACKEND_URL}/api/product_category`);
      const afterById = Object.fromEntries((categoriesAfter || []).map((item) => [item.category_id, item]));
      const afterByName = Object.fromEntries((categoriesAfter || []).map((item) => [item.category_name, item.category_id]));

      const liveProducts = await requestJson(`${BACKEND_URL}/api/product`);
      const productByCode = Object.fromEntries((liveProducts || []).map((item) => [item.product_code, item]));

      for (const product of backupProducts) {
        const categoryId = resolveCategoryId(product, afterByName, afterById);
        await uploadProduct(product, categoryId, productByCode[product.product_code]);
      }

      for (const user of backupUsers) {
        if (!user.username) continue;
        try {
          await requestJson(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: user.full_name || user.username,
              username: user.username,
              password: 'Restore@123',
              role: user.role || 'staff',
            }),
          });
        } catch {
          // Bỏ qua user đã tồn tại
        }
      }

      await loadAll();
      showStatus('Khôi phục hoàn tất. Người dùng mới được đặt mật khẩu tạm là Restore@123.');
    } catch (error) {
      showStatus(`Khôi phục thất bại: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const menuItems = [
    { key: 'users', label: 'Quản lý người dùng', active: activeTab === 'users', onClick: () => setActiveTab('users') },
    { key: 'categories', label: 'Danh mục hàng hóa', active: activeTab === 'categories', onClick: () => setActiveTab('categories') },
    { key: 'stats', label: 'Thống kê hệ thống', active: activeTab === 'stats', onClick: () => setActiveTab('stats') },
    { key: 'backup', label: 'Sao lưu và khôi phục', active: activeTab === 'backup', onClick: () => setActiveTab('backup') },
  ];

  return (
    <div className="app-shell app-shell-admin">
      <Sidebar
        title="Smart Pharma Admin"
        subtitle={currentUser ? `Đăng nhập: ${currentUser.username}` : 'Quản trị hệ thống'}
        menuItems={menuItems}
        onLogout={handleLogout}
      />

      <main className="main-panel">
        <section className="hero">
          <div>
            <h1>Trang quản trị admin</h1>
            <p>Quản lý người dùng, danh mục, báo cáo thống kê và sao lưu dữ liệu.</p>
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={loadAll} disabled={isWorking}>
              Làm mới dữ liệu
            </button>
          </div>
        </section>

        <div className="tab-strip">
          <button type="button" className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            Người dùng + Đăng ký
          </button>
          <button type="button" className={`tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            Quản lý danh mục
          </button>
          <button type="button" className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
            Thống kê + Xuất báo cáo
          </button>
          <button type="button" className={`tab ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
            Sao lưu / Khôi phục
          </button>
        </div>

        {activeTab === 'users' && (
          <>
            <div className="grid-3">
              <article className="kpi">
                <h4>Tổng người dùng</h4>
                <p>{users.length}</p>
              </article>
              <article className="kpi">
                <h4>Admin</h4>
                <p>{roleStats.adminCount}</p>
              </article>
              <article className="kpi">
                <h4>Staff</h4>
                <p>{roleStats.staffCount}</p>
              </article>
            </div>

            <div className="split">
              <section className="card">
                <h3>Danh sách người dùng</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã người dùng</th>
                        <th>Tài khoản</th>
                        <th>Họ tên</th>
                        <th>Vai trò</th>
                        <th>Ngày tạo</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((item) => {
                        const viewRole = fromBackendRole(item.role);
                        const isSelf = currentUser?.username && currentUser.username === item.username;
                        return (
                          <tr key={item.user_id}>
                            <td>{item.user_id}</td>
                            <td>{item.username}</td>
                            <td>{item.full_name || '-'}</td>
                            <td>
                              <span className={`badge ${viewRole === 'admin' ? 'badge-warning' : 'badge-success'}`}>
                                {viewRole}
                              </span>
                            </td>
                            <td>{formatDate(item.created_at)}</td>
                            <td>
                              <div className="btn-row">
                                <select
                                  value={viewRole}
                                  onChange={(event) => handleChangeRole(item.user_id, event.target.value)}
                                  disabled={isWorking}
                                >
                                  <option value="admin">admin</option>
                                  <option value="staff">staff</option>
                                </select>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleDeleteUser(item)}
                                  disabled={isWorking || isSelf}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <h3>Đăng ký tài khoản cho nhân viên</h3>
                <form className="form-grid" onSubmit={handleRegisterUser}>
                  <div className="field full">
                    <label>Họ và tên</label>
                    <input
                      value={registerForm.full_name}
                      onChange={(event) => setRegisterForm((prev) => ({ ...prev, full_name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Tên đăng nhập</label>
                    <input
                      value={registerForm.username}
                      onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Mật khẩu</label>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field full">
                    <label>Vai trò</label>
                    <select
                      value={registerForm.role}
                      onChange={(event) => setRegisterForm((prev) => ({ ...prev, role: event.target.value }))}
                    >
                      <option value="staff">staff</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <div className="btn-row">
                    <button type="submit" className="btn btn-primary" disabled={isWorking}>
                      Tạo tài khoản
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}

        {activeTab === 'categories' && (
          <div className="split">
            <section className="card">
              <h3>Danh sách danh mục hàng hóa</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên danh mục</th>
                      <th>Mô tả</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((item) => (
                      <tr key={item.category_id}>
                        <td>{item.category_id}</td>
                        <td>{item.category_name}</td>
                        <td>{item.description || '-'}</td>
                        <td>
                          <div className="btn-row">
                            <button type="button" className="btn btn-secondary" onClick={() => handleEditCategory(item)}>
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => handleDeleteCategory(item.category_id)}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3>{editingCategoryId ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}</h3>
              <form className="form-grid" onSubmit={handleSaveCategory}>
                <div className="field full">
                  <label>Tên danh mục</label>
                  <input
                    value={categoryForm.category_name}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, category_name: event.target.value }))}
                    required
                  />
                </div>
                <div className="field full">
                  <label>Mô tả</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>

                <div className="btn-row">
                  <button type="submit" className="btn btn-primary" disabled={isWorking}>
                    {editingCategoryId ? 'Lưu thay đổi' : 'Thêm danh mục'}
                  </button>
                  {editingCategoryId ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm({ category_name: '', description: '' });
                      }}
                    >
                      Hủy
                    </button>
                  ) : null}
                </div>
              </form>
            </section>
          </div>
        )}

        {activeTab === 'stats' && (
          <>
            <div className="grid-3">
              <article className="kpi">
                <h4>Sản phẩm sắp hết hạn</h4>
                <p>{summary.stats.expiring_products}</p>
              </article>
              <article className="kpi">
                <h4>Đơn hàng mới</h4>
                <p>{summary.stats.new_orders}</p>
              </article>
              <article className="kpi">
                <h4>Nhập kho tháng</h4>
                <p>{Number(summary.stats.monthly_import || 0).toLocaleString('vi-VN')}</p>
              </article>
              <article className="kpi">
                <h4>Tổng ước tính đã xuất kho</h4>
                <p>{totalEstimatedExported.toLocaleString('vi-VN')}</p>
              </article>
            </div>

            <section className="card">
              <div className="hero" style={{ marginBottom: 12 }}>
                <div>
                  <h3>Thống kê toàn bộ hệ thống</h3>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn btn-primary" onClick={handleExportReport}>
                    Xuất báo cáo
                  </button>
                </div>
              </div>

              <SalesChart
                labels={summary.chart?.labels || []}
                values={summary.chart?.values || []}
                label={summary.chart?.label || 'Thống kê hệ thống'}
              />

              <div className="table-wrap" style={{ marginTop: 14 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Hạn dùng</th>
                      <th>Mức độ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.expiry_alerts || []).length === 0 ? (
                      <tr>
                        <td colSpan={3}>Không có cảnh báo.</td>
                      </tr>
                    ) : (
                      (summary.expiry_alerts || []).map((item) => (
                        <tr key={`expiry-${item.product_id}-${item.expiry_date}`}>
                          <td>{item.product_name}</td>
                          <td>{formatDate(item.expiry_date)}</td>
                          <td>
                            <span
                              className={`badge ${
                                item.risk_level === 'EXPIRED' || item.risk_level === 'HIGH'
                                  ? 'badge-danger'
                                  : item.risk_level === 'MEDIUM'
                                    ? 'badge-warning'
                                    : 'badge-success'
                              }`}
                            >
                              {item.risk_level || 'LOW'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-wrap" style={{ marginTop: 14 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Tên sản phẩm</th>
                      <th>Đơn vị</th>
                      <th>Tồn hiện tại</th>
                      <th>Cảnh báo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockRows.length === 0 ? (
                      <tr>
                        <td colSpan={5}>Không có sản phẩm tồn thấp.</td>
                      </tr>
                    ) : (
                      lowStockRows.map((item) => (
                        <tr key={`admin-low-${item.product_id}`}>
                          <td>{item.product_code}</td>
                          <td>{item.product_name}</td>
                          <td>{item.unit}</td>
                          <td>{item.quantity}</td>
                          <td>
                            <span className={`badge ${item.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                              {item.quantity === 0 ? 'Het hang' : 'Sap het hang'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === 'backup' && (
          <section className="card">
            <h3>Sao lưu và khôi phục database</h3>
            <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
              Sao lưu: tải dữ liệu hệ thống thành file JSON. Khôi phục: đọc file sao lưu và đồng bộ danh mục,
              sản phẩm, người dùng.
            </p>

            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button type="button" className="btn btn-primary" onClick={handleBackup} disabled={isWorking}>
                Sao lưu dữ liệu
              </button>
            </div>

            <div className="form-grid">
              <div className="field full">
                <label>Chọn file sao lưu (.json)</label>
                <input
                  type="file"
                  accept="application/json"
                  onChange={(event) => setBackupFile(event.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-danger" onClick={handleRestore} disabled={isWorking}>
                Khôi phục dữ liệu
              </button>
            </div>

            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Chỉ số hiện tại</th>
                    <th>Giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tổng user</td>
                    <td>{users.length}</td>
                  </tr>
                  <tr>
                    <td>Tổng danh mục</td>
                    <td>{categories.length}</td>
                  </tr>
                  <tr>
                    <td>Tổng sản phẩm</td>
                    <td>{products.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {status.text ? <p className={`status-msg ${status.isError ? 'error' : ''}`}>{status.text}</p> : null}
      </main>
    </div>
  );
};

export default AdminWorkspace;
