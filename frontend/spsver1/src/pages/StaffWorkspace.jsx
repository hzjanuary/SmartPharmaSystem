import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import SalesChart from '../components/SalesChart';
import Sidebar from '../components/Sidebar';
import { AI_URL, BACKEND_URL, requestJson } from '../utils/api';
import { clearSessionUser, getSessionUser } from '../utils/session';
import './RoleWorkspace.css';

const defaultSummary = {
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

const toDisplayImage = (image) => {
  if (!image) return '/placeholder.png';
  if (String(image).startsWith('http')) return image;
  return `${BACKEND_URL}/uploads/${image}`;
};

const normalizeExpiry = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const normalizeImportDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // Already in ISO-like format.
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  // Common US-style format from spreadsheet parsing: M/D/YY or M/D/YYYY.
  const mdYMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (mdYMatch) {
    const month = Number(mdYMatch[1]);
    const day = Number(mdYMatch[2]);
    const yearRaw = Number(mdYMatch[3]);
    const year = mdYMatch[3].length === 2 ? 2000 + yearRaw : yearRaw;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
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

const normalizeHeader = (header) =>
  String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const parseSpreadsheetFile = async (file) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
};

const StaffWorkspace = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [summary, setSummary] = useState(defaultSummary);
  const [fefoData, setFefoData] = useState([]);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [productImportFile, setProductImportFile] = useState(null);
  const [stockOutImportFile, setStockOutImportFile] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    category_id: '',
    unit: '',
    purchase_price: '',
    selling_price: '',
    quantity: '',
    expiry_date: '',
    image: '',
    description: '',
  });

  const [status, setStatus] = useState({ text: '', isError: false });
  const [isWorking, setIsWorking] = useState(false);

  const user = getSessionUser();

  const categoriesMap = useMemo(() => {
    const map = {};
    categories.forEach((item) => {
      map[item.category_id] = item;
    });
    return map;
  }, [categories]);

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
          product_code: item.product_code || '',
          product_name: item.product_name || '',
          unit: item.unit || '',
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

  const setMessage = (text, isError = false) => {
    setStatus({ text, isError });
  };

  useEffect(() => {
    if (!status.text) return;
    const timer = setTimeout(() => setStatus({ text: '', isError: false }), 3200);
    return () => clearTimeout(timer);
  }, [status]);

  const loadSummary = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/dashboard/summary`);
      setSummary({ ...defaultSummary, ...payload });
    } catch (error) {
      setMessage(`Không tải được dashboard: ${error.message}`, true);
    }
  }, []);

  const loadFefo = useCallback(async () => {
    try {
      const payload = await requestJson(`${AI_URL}/api/v1/inventory-recommendation/from-db`, {
        credentials: 'omit',
      });
      setFefoData(Array.isArray(payload.recommendations) ? payload.recommendations : []);
    } catch {
      setFefoData([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/product`);
      const rows = Array.isArray(payload) ? payload : [];
      setProducts(
        rows.map((item) => ({
          ...item,
          expiry_date: normalizeExpiry(item.expiry_date),
          displayImage: toDisplayImage(item.image),
        }))
      );
    } catch (error) {
      setMessage(`Không tải được hàng hóa: ${error.message}`, true);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/product_category`);
      setCategories(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setMessage(`Không tải được danh mục: ${error.message}`, true);
    }
  }, []);

  const loadImportHistory = useCallback(async () => {
    try {
      const payload = await requestJson(`${BACKEND_URL}/api/history_import`);
      setImportHistory(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setImportHistory([]);
      setMessage(`Không tải được lịch sử nhập kho: ${error.message}`, true);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsWorking(true);
    await Promise.all([loadSummary(), loadFefo(), loadProducts(), loadCategories(), loadImportHistory()]);
    setIsWorking(false);
  }, [loadCategories, loadFefo, loadImportHistory, loadProducts, loadSummary]);

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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFormData((prev) => ({ ...prev, image: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.product_id);
      setFormData({ ...product });
      setImagePreview(product.displayImage || null);
    } else {
      setEditingId(null);
      setFormData({
        product_code: '',
        product_name: '',
        category_id: '',
        unit: '',
        purchase_price: '',
        selling_price: '',
        quantity: '',
        expiry_date: '',
        image: '',
        description: '',
      });
      setImagePreview(null);
    }
    setShowModal(true);
  };

  const saveProduct = async (event) => {
    event.preventDefault();

    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      payload.append(key, formData[key] ?? '');
    });

    const url = editingId ? `${BACKEND_URL}/api/product/${editingId}` : `${BACKEND_URL}/api/product`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      setIsWorking(true);
      const response = await fetch(url, {
        method,
        credentials: 'include',
        body: payload,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      setShowModal(false);
      setMessage(editingId ? 'Cập nhật hàng hóa thành công.' : 'Thêm hàng hóa thành công.');
      await loadProducts();
    } catch (error) {
      setMessage(`Không thể lưu hàng hóa: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const isConfirmed = window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.product_name}" không?`);
    if (!isConfirmed) return;

    try {
      setIsWorking(true);
      await requestJson(`${BACKEND_URL}/api/product/${product.product_id}`, {
        method: 'DELETE',
      });
      setMessage('Xóa hàng hóa thành công.');
      await loadProducts();
    } catch (error) {
      setMessage(`Không thể xóa hàng hóa: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleStockOutProduct = async (product) => {
    const currentQty = Number(product.quantity || 0);
    const rawQty = window.prompt(
      `Nhập số lượng xuất kho cho "${product.product_name}" (tồn hiện tại: ${currentQty})`,
      '1'
    );

    if (rawQty === null) return;

    const exportQty = Number(rawQty);
    if (!Number.isInteger(exportQty) || exportQty <= 0) {
      setMessage('Số lượng xuất kho phải là số nguyên dương.', true);
      return;
    }

    if (exportQty > currentQty) {
      setMessage('Số lượng xuất kho không được lớn hơn tồn hiện tại.', true);
      return;
    }

    const confirmed = window.confirm(
      `Xác nhận xuất kho ${exportQty} ${product.unit || ''} cho sản phẩm "${product.product_name}"?`
    );
    if (!confirmed) return;

    const payload = new FormData();
    payload.append('product_code', product.product_code || '');
    payload.append('product_name', product.product_name || '');
    payload.append('category_id', product.category_id || '');
    payload.append('unit', product.unit || '');
    payload.append('purchase_price', product.purchase_price || 0);
    payload.append('selling_price', product.selling_price || 0);
    payload.append('quantity', Math.max(currentQty - exportQty, 0));
    payload.append('expiry_date', product.expiry_date || '');
    payload.append('description', product.description || '');
    payload.append('image', product.image || '');

    try {
      setIsWorking(true);
      const response = await fetch(`${BACKEND_URL}/api/product/${product.product_id}`, {
        method: 'PUT',
        credentials: 'include',
        body: payload,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      setMessage(`Xuất kho thành công: -${exportQty} ${product.unit || ''} (${product.product_name}).`);
      await Promise.all([loadProducts(), loadSummary(), loadFefo()]);
    } catch (error) {
      setMessage(`Không thể xuất kho: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleExportStockOutReport = () => {
    if (stockOutReportRows.length === 0) {
      setMessage('Chưa có dữ liệu để xuất báo cáo xuất kho.', true);
      return;
    }

    const rows = [
      csvLine(['Mã sản phẩm', 'Tên sản phẩm', 'Đơn vị', 'Tổng nhập', 'Tồn hiện tại', 'Ước tính đã xuất']),
      ...stockOutReportRows.map((row) =>
        csvLine([row.product_code, row.product_name, row.unit, row.importedQty, row.currentQty, row.exportedQty])
      ),
    ];

    const fileName = `bao-cao-xuat-kho-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(rows.join('\n'), fileName, 'text/csv;charset=utf-8;');
    setMessage('Đã xuất báo cáo xuất kho (CSV).');
  };

  const buildProductUpdatePayload = (product, nextQty) => {
    const payload = new FormData();
    payload.append('product_code', product.product_code || '');
    payload.append('product_name', product.product_name || '');
    payload.append('category_id', product.category_id || '');
    payload.append('unit', product.unit || '');
    payload.append('purchase_price', product.purchase_price || 0);
    payload.append('selling_price', product.selling_price || 0);
    payload.append('quantity', nextQty);
    payload.append('expiry_date', product.expiry_date || '');
    payload.append('description', product.description || '');
    payload.append('image', product.image || '');
    return payload;
  };

  const resolveCategoryIdFromCsv = (row, headerMap) => {
    const categoryIdRaw =
      row[headerMap.category_id] ??
      row[headerMap.danh_muc_id] ??
      row[headerMap.category] ??
      '';

    const numericCategoryId = Number(String(categoryIdRaw || '').trim());
    // Do not depend on async category list loading; backend will enforce FK validity.
    if (Number.isInteger(numericCategoryId) && numericCategoryId > 0) {
      return numericCategoryId;
    }

    const categoryNameRaw = row[headerMap.category_name] ?? row[headerMap.danh_muc] ?? '';
    const categoryName = String(categoryNameRaw || '').trim().toLowerCase();
    if (!categoryName) return '';

    const found = categories.find((item) => String(item.category_name || '').trim().toLowerCase() === categoryName);
    return found ? found.category_id : '';
  };

  const handleImportProductsFromFile = async () => {
    if (!productImportFile) {
      setMessage('Vui lòng chọn file Excel/CSV trước khi import sản phẩm.', true);
      return;
    }

    try {
      setIsWorking(true);

      const rawRows = await parseSpreadsheetFile(productImportFile);
      if (!rawRows.length) {
        throw new Error('File import không có dữ liệu sản phẩm.');
      }

      const rows = rawRows.map((row) => {
        const normalized = {};
        Object.entries(row).forEach(([key, value]) => {
          normalized[normalizeHeader(key)] = value;
        });
        return normalized;
      });

      const headerMap = Object.keys(rows[0] || {}).reduce((acc, key) => ({ ...acc, [key]: key }), {});

      if (headerMap.product_code === undefined || headerMap.product_name === undefined) {
        throw new Error('CSV cần tối thiểu cột product_code và product_name.');
      }

      let success = 0;
      let failed = 0;
      const failures = [];

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const get = (key) => row[headerMap[key]] ?? '';

        const productCode = String(get('product_code')).trim();
        const productName = String(get('product_name')).trim();

        if (!productCode || !productName) {
          failed += 1;
          failures.push(`Dòng ${i + 2}: thiếu product_code hoặc product_name`);
          continue;
        }

        const categoryId = resolveCategoryIdFromCsv(row, headerMap);
        if (!categoryId) {
          failed += 1;
          failures.push(`Dòng ${i + 2} (${productCode}): category_id/category_name không hợp lệ`);
          continue;
        }

        const form = new FormData();
        form.append('product_code', productCode);
        form.append('product_name', productName);
        form.append('category_id', String(categoryId));
        form.append('unit', String(get('unit') || get('don_vi') || ''));
        form.append('purchase_price', String(get('purchase_price') || get('gia_nhap') || 0));
        form.append('selling_price', String(get('selling_price') || get('gia_ban') || 0));
        form.append('quantity', String(get('quantity') || get('so_luong') || 0));
        const expiryDate = normalizeImportDate(get('expiry_date') || get('han_dung') || '');
        form.append('expiry_date', expiryDate);
        form.append('description', String(get('description') || get('mo_ta') || ''));
        form.append('image', String(get('image') || get('hinh_anh') || ''));

        try {
          const response = await fetch(`${BACKEND_URL}/api/product`, {
            method: 'POST',
            credentials: 'include',
            body: form,
          });

          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            const detail = payload.error && payload.error !== payload.message ? ` (${payload.error})` : '';
            throw new Error(`${payload.message || payload.error || `HTTP ${response.status}`}${detail}`);
          }

          success += 1;
        } catch (error) {
          failed += 1;
          failures.push(`Dòng ${i + 2} (${productCode}): ${error.message}`);
        }
      }

      await loadProducts();
      await loadImportHistory();

      if (failed > 0) {
        setMessage(`Import sản phẩm hoàn tất: thành công ${success}, lỗi ${failed}. ${failures.slice(0, 2).join(' | ')}`, true);
      } else {
        setMessage(`Import sản phẩm thành công ${success} dòng.`);
      }
    } catch (error) {
      setMessage(`Import sản phẩm thất bại: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleBulkStockOutFromFile = async () => {
    if (!stockOutImportFile) {
      setMessage('Vui lòng chọn file Excel/CSV trước khi xuất kho hàng loạt.', true);
      return;
    }

    try {
      setIsWorking(true);

      const rawRows = await parseSpreadsheetFile(stockOutImportFile);
      if (!rawRows.length) {
        throw new Error('File xuất kho không có dữ liệu.');
      }

      const rows = rawRows.map((row) => {
        const normalized = {};
        Object.entries(row).forEach(([key, value]) => {
          normalized[normalizeHeader(key)] = value;
        });
        return normalized;
      });

      const productByCode = {};
      products.forEach((item) => {
        productByCode[String(item.product_code || '').trim().toLowerCase()] = item;
      });

      const qtyByProductId = Object.fromEntries(products.map((item) => [item.product_id, Number(item.quantity || 0)]));

      let success = 0;
      let failed = 0;
      const failures = [];

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const code = String(row.product_code || row.ma_san_pham || row.sku || '').trim();
        const qtyRaw = row.export_quantity || row.so_luong_xuat || row.quantity || row.so_luong || '';
        const exportQty = Number(qtyRaw);

        if (!code) {
          failed += 1;
          failures.push(`Dòng ${i + 2}: thiếu product_code`);
          continue;
        }

        if (!Number.isInteger(exportQty) || exportQty <= 0) {
          failed += 1;
          failures.push(`Dòng ${i + 2} (${code}): số lượng xuất không hợp lệ`);
          continue;
        }

        const product = productByCode[code.toLowerCase()];
        if (!product) {
          failed += 1;
          failures.push(`Dòng ${i + 2} (${code}): không tìm thấy sản phẩm`);
          continue;
        }

        const currentQty = qtyByProductId[product.product_id] ?? Number(product.quantity || 0);
        if (exportQty > currentQty) {
          failed += 1;
          failures.push(`Dòng ${i + 2} (${code}): vượt quá tồn hiện tại (${currentQty})`);
          continue;
        }

        try {
          const payload = buildProductUpdatePayload(product, Math.max(currentQty - exportQty, 0));
          const response = await fetch(`${BACKEND_URL}/api/product/${product.product_id}`, {
            method: 'PUT',
            credentials: 'include',
            body: payload,
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(result.message || `HTTP ${response.status}`);
          }

          qtyByProductId[product.product_id] = Math.max(currentQty - exportQty, 0);
          success += 1;
        } catch (error) {
          failed += 1;
          failures.push(`Dòng ${i + 2} (${code}): ${error.message}`);
        }
      }

      await Promise.all([loadProducts(), loadSummary(), loadFefo(), loadImportHistory()]);

      if (failed > 0) {
        setMessage(`Xuất kho hàng loạt hoàn tất: thành công ${success}, lỗi ${failed}. ${failures.slice(0, 2).join(' | ')}`, true);
      } else {
        setMessage(`Xuất kho hàng loạt thành công ${success} dòng.`);
      }
    } catch (error) {
      setMessage(`Xuất kho hàng loạt thất bại: ${error.message}`, true);
    } finally {
      setIsWorking(false);
    }
  };

  const menuItems = [
    { key: 'dashboard', label: 'Bảng điều khiển', active: activeTab === 'dashboard', onClick: () => setActiveTab('dashboard') },
    { key: 'products', label: 'Quản lý hàng hóa', active: activeTab === 'products', onClick: () => setActiveTab('products') },
    { key: 'stockout-report', label: 'Báo cáo xuất kho', active: activeTab === 'stockout-report', onClick: () => setActiveTab('stockout-report') },
  ];

  return (
    <div className="app-shell app-shell-staff">
      <Sidebar
        title="Smart Pharma Staff"
        subtitle={user ? `Đăng nhập: ${user.username}` : 'Nhân viên kho'}
        menuItems={menuItems}
        onLogout={handleLogout}
      />

      <main className="main-panel">
        <section className="hero">
          <div>
            <h1>Trang nhân viên</h1>
            <p>Bảng điều khiển theo dõi tồn kho và quản lý thêm/sửa/xóa hàng hóa.</p>
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={loadAll} disabled={isWorking}>
              Làm mới
            </button>
            {activeTab === 'products' ? (
              <button type="button" className="btn btn-primary" onClick={() => openModal()}>
                Thêm hàng hóa
              </button>
            ) : null}
          </div>
        </section>

        <div className="tab-strip">
          <button type="button" className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            Bảng điều khiển
          </button>
          <button type="button" className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            Hàng hóa
          </button>
          <button type="button" className={`tab ${activeTab === 'stockout-report' ? 'active' : ''}`} onClick={() => setActiveTab('stockout-report')}>
            Báo cáo xuất kho
          </button>
        </div>

        {activeTab === 'dashboard' && (
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

            <section className="card" style={{ marginBottom: 14 }}>
              <h3>{summary.chart?.label || 'Thống kê theo ngày'}</h3>
              <SalesChart
                labels={summary.chart?.labels || []}
                values={summary.chart?.values || []}
                label={summary.chart?.label || 'Số lượng'}
              />
            </section>

            <section className="card" style={{ marginBottom: 14 }}>
              <h3>Cảnh báo tồn kho thấp hoặc đã hết</h3>
              <div className="table-wrap">
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
                        <tr key={`low-stock-${item.product_id}`}>
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

            <div className="split">
              <section className="card">
                <h3>Ưu tiên xuất hàng FEFO</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Thứ tự</th>
                        <th>Tên thuốc</th>
                        <th>Số lượng</th>
                        <th>Hạn dùng</th>
                        <th>Ngày còn lại</th>
                        <th>Mức độ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fefoData.length === 0 ? (
                        <tr>
                          <td colSpan={6}>Không có gợi ý FEFO từ AI service.</td>
                        </tr>
                      ) : (
                        fefoData.map((item) => (
                          <tr key={`${item.priority}-${item.lot_id || item.product_id}`}>
                            <td>{item.priority}</td>
                            <td>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatDate(item.expiry_date)}</td>
                            <td>{item.days_to_expiry}</td>
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
              </section>

              <section className="card">
                <h3>Cảnh báo hạn dùng</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Hạn dùng</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary.expiry_alerts || []).length === 0 ? (
                        <tr>
                          <td colSpan={3}>Không có cảnh báo.</td>
                        </tr>
                      ) : (
                        (summary.expiry_alerts || []).map((item) => (
                          <tr key={`alert-${item.product_id}`}>
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
              </section>
            </div>
          </>
        )}

        {activeTab === 'products' && (
          <section className="card">
            <h3>Quản lý hàng hóa (staff)</h3>
            <p style={{ color: 'var(--ink-soft)' }}>
              Staff được thêm/sửa/xóa sản phẩm. Danh mục chỉ để chọn, không có chức năng sửa/xóa danh mục.
            </p>

            <div className="card" style={{ marginBottom: 14 }}>
              <h3>Import danh sách sản phẩm từ Excel/CSV</h3>
              <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
                Cột bắt buộc: product_code, product_name. Cột hỗ trợ: category_id/category_name, unit, purchase_price,
                selling_price, quantity, expiry_date, image, description.
              </p>
              <div className="btn-row">
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => setProductImportFile(event.target.files?.[0] || null)}
                />
                <button type="button" className="btn btn-primary" onClick={handleImportProductsFromFile} disabled={isWorking}>
                  Import sản phẩm
                </button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              <h3>Xuất kho hàng loạt từ Excel/CSV</h3>
              <p style={{ color: 'var(--ink-soft)', marginTop: 0 }}>
                Cột bắt buộc: product_code và export_quantity (hoặc so_luong_xuat).
              </p>
              <div className="btn-row">
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => setStockOutImportFile(event.target.files?.[0] || null)}
                />
                <button type="button" className="btn btn-primary" onClick={handleBulkStockOutFromFile} disabled={isWorking}>
                  Xuất kho hàng loạt
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Mã</th>
                    <th>Tên</th>
                    <th>Danh mục</th>
                    <th>Đơn vị</th>
                    <th>Giá nhập</th>
                    <th>Giá bán</th>
                    <th>Số lượng</th>
                    <th>Hạn dùng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.product_id}>
                      <td>
                        <img className="product-thumb" src={item.displayImage} alt={item.product_name} />
                      </td>
                      <td>{item.product_code}</td>
                      <td>{item.product_name}</td>
                      <td>{item.category_name || categoriesMap[item.category_id]?.category_name || '-'}</td>
                      <td>{item.unit}</td>
                      <td>{Number(item.purchase_price || 0).toLocaleString('vi-VN')}</td>
                      <td>{Number(item.selling_price || 0).toLocaleString('vi-VN')}</td>
                      <td>{item.quantity}</td>
                      <td>{item.expiry_date || '-'}</td>
                      <td>
                        <div className="btn-row">
                          <button type="button" className="btn btn-primary" onClick={() => handleStockOutProduct(item)}>
                            Xuất kho
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => openModal(item)}>
                            Sửa
                          </button>
                          <button type="button" className="btn btn-danger" onClick={() => handleDeleteProduct(item)}>
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
        )}

        {activeTab === 'stockout-report' && (
          <section className="card">
            <section className="hero" style={{ marginBottom: 12 }}>
              <div>
                <h3>Báo cáo xuất kho (ước tính)</h3>
                <p>
                  Dựa trên công thức: tổng nhập từ history_import trừ tồn hiện tại trong product.
                </p>
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-primary" onClick={handleExportStockOutReport}>
                  Xuất báo cáo CSV
                </button>
              </div>
            </section>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên sản phẩm</th>
                    <th>Đơn vị</th>
                    <th>Tổng nhập</th>
                    <th>Tồn hiện tại</th>
                    <th>Ước tính đã xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {stockOutReportRows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Chưa có dữ liệu xuất kho để hiển thị.</td>
                    </tr>
                  ) : (
                    stockOutReportRows.map((row) => (
                      <tr key={`stockout-${row.product_id}`}>
                        <td>{row.product_code || '-'}</td>
                        <td>{row.product_name}</td>
                        <td>{row.unit || '-'}</td>
                        <td>{row.importedQty}</td>
                        <td>{row.currentQty}</td>
                        <td>{row.exportedQty}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {status.text ? (
          <div className={`toast-notify ${status.isError ? 'toast-error' : 'toast-success'}`}>
            {status.text}
          </div>
        ) : null}
      </main>

      {showModal && (
        <div className="modal">
          <div className="modal-box">
            <section className="hero" style={{ marginBottom: 10 }}>
              <div>
                <h3>{editingId ? 'Sửa hàng hóa' : 'Thêm hàng hóa'}</h3>
                <p>Chọn danh mục có sẵn, không chỉnh sửa danh mục tại đây.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Đóng
              </button>
            </section>

            <form className="form-grid" onSubmit={saveProduct}>
              <div className="field">
                <label>Mã sản phẩm</label>
                <input name="product_code" value={formData.product_code || ''} onChange={handleInputChange} required />
              </div>
              <div className="field">
                <label>Tên sản phẩm</label>
                <input name="product_name" value={formData.product_name || ''} onChange={handleInputChange} required />
              </div>

              <div className="field">
                <label>Danh mục</label>
                <select name="category_id" value={formData.category_id || ''} onChange={handleInputChange} required>
                  <option value="">Chọn danh mục</option>
                  {categories.map((item) => (
                    <option key={item.category_id} value={item.category_id}>
                      {item.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Đơn vị</label>
                <input name="unit" value={formData.unit || ''} onChange={handleInputChange} required />
              </div>

              <div className="field">
                <label>Giá nhập</label>
                <input
                  type="number"
                  name="purchase_price"
                  value={formData.purchase_price || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="field">
                <label>Giá bán</label>
                <input
                  type="number"
                  name="selling_price"
                  value={formData.selling_price || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="field">
                <label>Số lượng</label>
                <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleInputChange} required />
              </div>
              <div className="field">
                <label>Hạn dùng</label>
                <input type="date" name="expiry_date" value={formData.expiry_date || ''} onChange={handleInputChange} />
              </div>

              <div className="field full">
                <label>Ảnh sản phẩm</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                <input
                  style={{ marginTop: 8 }}
                  name="image"
                  placeholder="hoặc dán URL ảnh"
                  value={typeof formData.image === 'string' ? formData.image : ''}
                  onChange={handleInputChange}
                />
                {imagePreview ? <img src={imagePreview} alt="preview" className="product-thumb" style={{ marginTop: 8 }} /> : null}
              </div>

              <div className="field full">
                <label>Mô tả</label>
                <textarea name="description" value={formData.description || ''} onChange={handleInputChange} />
              </div>

              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isWorking}>
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffWorkspace;
