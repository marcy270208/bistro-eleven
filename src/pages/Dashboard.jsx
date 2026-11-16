import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import XLSX from 'xlsx-js-style';
import { api } from '../lib/api';
import { uploadImageFile } from '../lib/imageUpload';
import { useLanguage } from '../lib/i18n';

const Dashboard = ({ user, token, orders, setOrders, dishes, setDishes }) => {
  const { isId } = useLanguage();
  const [showSalesModal, setShowSalesModal] = React.useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [filter, setFilter] = useState('Active');
  const isAdmin = user?.role === 'administrator';

  const [newDish, setNewDish] = useState({ name: '', price: '', description: '', ingredients: '', photo: null, preview: null });
  const [uploadingDishPhoto, setUploadingDishPhoto] = useState(false);
  const [savingDish, setSavingDish] = useState(false);
  const [chefInquiries, setChefInquiries] = useState([]);
  const [inquiryFilter, setInquiryFilter] = useState('Pending');
  const [chefDrafts, setChefDrafts] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [inquiriesLoading, setInquiriesLoading] = useState(isAdmin);
  const [inquiriesError, setInquiriesError] = useState('');

  // Spreadsheet export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportRange, setExportRange] = useState('all'); // 'all' | 'last_year' | 'month' | 'custom'
  const [exportStatus, setExportStatus] = useState('Completed'); // 'Completed' | 'All'
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDishPhoto(true);
    try {
      const uploadedUrl = await uploadImageFile(file, token);
      setNewDish((current) => ({ ...current, photo: uploadedUrl, preview: uploadedUrl }));
    } catch (error) {
      alert(error.message || (isId ? 'Gagal mengunggah foto menu.' : 'Could not upload dish photo.'));
      e.target.value = '';
    } finally {
      setUploadingDishPhoto(false);
    }
  };

  const handleAddDish = async (e) => {
    e.preventDefault();
    if (!newDish.photo) {
      alert(isId ? 'Tunggu hingga foto selesai diunggah.' : 'Please wait until the photo finishes uploading.');
      return;
    }
    setSavingDish(true);
    try {
      const createdDish = await api('/api/dishes', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: newDish.name,
          price: parseInt(newDish.price, 10),
          description: newDish.description,
          ingredients: newDish.ingredients
            .split(/[,;\n]/)
            .map((item) => item.trim())
            .filter(Boolean),
          image: newDish.photo,
        }),
      });
      setDishes((current) => [...current, createdDish]);
      setNewDish({ name: '', price: '', description: '', ingredients: '', photo: null, preview: null });
      e.target.reset();
      alert(
        isId
          ? 'Menu dan URL foto cloud berhasil disimpan ke database.'
          : 'The dish and its cloud photo URL were saved to the database.'
      );
    } catch (error) {
      alert(error.message || 'Could not add dish.');
    } finally {
      setSavingDish(false);
    }
  };

  const handleDeleteDish = async (id) => {
    try {
      await api(`/api/dishes/${encodeURIComponent(id)}`, { method: 'DELETE', token });
      setDishes((current) => current.filter((d) => d.id !== id));
    } catch (error) {
      alert(error.message || 'Could not delete dish.');
    }
  };

  const loadOrders = React.useCallback(
    (showSpinner = false) => {
      if (!token) return;
      if (showSpinner) setOrdersLoading(true);
      api('/api/orders', { token })
        .then((data) => {
          setOrders(data);
          setOrdersError('');
        })
        .catch(() => {
          setOrdersError(isId ? 'Gagal memuat data pesanan dari server.' : 'Could not load orders from server.');
        })
        .finally(() => setOrdersLoading(false));
    },
    [token, isId, setOrders]
  );

  const loadInquiries = React.useCallback(
    (showSpinner = false) => {
      if (!token || !isAdmin) return;
      if (showSpinner) setInquiriesLoading(true);
      api('/api/ai/inquiries', { token })
        .then((data) => {
          if (Array.isArray(data)) setChefInquiries(data);
          setInquiriesError('');
        })
        .catch(() => {
          setInquiriesError(
            isId ? 'Gagal memuat pertanyaan pelanggan dari server.' : 'Could not load customer inquiries from server.'
          );
        })
        .finally(() => setInquiriesLoading(false));
    },
    [token, isAdmin, isId]
  );

  React.useEffect(() => {
    if (!token) return undefined;
    loadOrders(true);
    loadInquiries(true);
    const interval = window.setInterval(() => {
      loadOrders(false);
      loadInquiries(false);
    }, 8000);
    return () => {
      window.clearInterval(interval);
    };
  }, [token, loadOrders, loadInquiries]);

  const handleChefReply = async (inquiryId) => {
    const draft = (chefDrafts[inquiryId] || '').trim();
    if (!draft) {
      alert(isId ? 'Tulis balasan Chef terlebih dahulu.' : 'Please enter a Chef reply first.');
      return;
    }
    setReplyingId(inquiryId);
    try {
      const updated = await api(`/api/ai/inquiries/${encodeURIComponent(inquiryId)}/reply`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reply: draft }),
      });
      setChefInquiries((current) => current.map((item) => (item.id === inquiryId ? updated : item)));
      setChefDrafts((current) => ({ ...current, [inquiryId]: '' }));
    } catch (error) {
      alert(error.message || (isId ? 'Gagal mengirim balasan Chef.' : 'Could not send Chef reply.'));
    } finally {
      setReplyingId(null);
    }
  };

  const handleOrderStatus = async (id, newStatus) => {
    try {
      const updated = await api(`/api/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((current) => current.map((order) => (order.id === id ? updated : order)));
    } catch (error) {
      alert(error.message);
    }
  };

  const visibleOrders = isAdmin ? orders : orders.filter((o) => o.username === user?.username);

  let filteredOrders = visibleOrders;
  if (isAdmin) {
    if (filter === 'Active') {
      filteredOrders = visibleOrders.filter((o) => ['New', 'Preparing', 'On the way'].includes(o.status));
    } else if (filter === 'Completed') {
      filteredOrders = visibleOrders.filter((o) => o.status === 'Completed' || o.status === 'Cancelled');
    }
  }

  const completedOrders = orders.filter((o) => o.status === 'Completed');
  const revenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
  const preparingCount = orders.filter((o) => ['Preparing', 'New', 'On the way'].includes(o.status)).length;
  const pendingInquiriesCount = chefInquiries.filter((i) => i.status === 'Pending').length;
  const filteredInquiries = chefInquiries.filter((i) => {
    if (inquiryFilter === 'Pending') return i.status === 'Pending';
    if (inquiryFilter === 'Answered') return i.status === 'Answered';
    return true;
  });

  const chefTemplates = isId
    ? [
        'Bisa kami buatkan sesuai request (tanpa bahan tersebut), silakan tulis di Order Notes saat checkout.',
        'Semua bahan masakan di dapur Bistro Eleven 100% Halal dan disiapkan segar setiap hari.',
        'Untuk keamanan alergi, kami bisa menyiapkan dengan peralatan masak terpisah — beri catatan saat memesan.',
      ]
    : [
        'We can prepare your dish as requested (without that ingredient) — please mention it in Order Notes at checkout.',
        'All ingredients in the Bistro Eleven kitchen are 100% Halal and prepared fresh daily.',
        'For allergy safety, our kitchen can prepare your order with separate utensils — just leave a note at checkout.',
      ];

  const parseOrderDate = (createdAt) => {
    if (!createdAt) return null;
    const iso = String(createdAt).includes('T')
      ? String(createdAt)
      : `${String(createdAt).replace(' ', 'T')}Z`;
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d : null;
  };

  const exportMatchedOrders = orders.filter((order) => {
    if (exportStatus === 'Completed' && order.status !== 'Completed') return false;
    if (exportRange === 'all') return true;
    const orderDate = parseOrderDate(order.createdAt);
    if (!orderDate) return false;

    if (exportRange === 'last_year') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return orderDate >= oneYearAgo;
    }
    if (exportRange === 'month') {
      const targetYear = Number(exportYear);
      const targetMonth = Number(exportMonth);
      return (
        orderDate.getFullYear() === targetYear &&
        orderDate.getMonth() + 1 === targetMonth
      );
    }
    if (exportRange === 'custom') {
      if (exportFromDate) {
        const from = new Date(`${exportFromDate}T00:00:00`);
        if (orderDate < from) return false;
      }
      if (exportToDate) {
        const to = new Date(`${exportToDate}T23:59:59.999`);
        if (orderDate > to) return false;
      }
      return true;
    }
    return true;
  });

  const exportTotalRevenue = exportMatchedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const handleDownloadSpreadsheet = () => {
    if (exportMatchedOrders.length === 0) {
      alert(
        isId
          ? 'Tidak ada data pesanan pada rentang tanggal tersebut.'
          : 'No orders match the selected date range.'
      );
      return;
    }

    const cleanCell = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

    const periodLabel =
      exportRange === 'all'
        ? 'All Time'
        : exportRange === 'last_year'
          ? 'Last 1 Year'
          : exportRange === 'month'
            ? `${exportYear}-${exportMonth}`
            : `${exportFromDate || 'Start'} to ${exportToDate || 'Today'}`;

    const headers = [
      'Order ID',
      'Date & Time',
      'Customer Name',
      'Username',
      'Order Type',
      'Location / Table',
      'Items Ordered',
      'Order Notes',
      'Payment Method',
      'Total (IDR)',
      'Status',
    ];

    const dataRows = exportMatchedOrders.map((order) => {
      const dt = parseOrderDate(order.createdAt);
      const formattedDate = dt
        ? dt.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : order.createdAt || '';
      const itemsText = Array.isArray(order.items)
        ? order.items.map((item) => `${item.qty}x ${item.name}`).join('\n')
        : '';
      return [
        cleanCell(order.id),
        cleanCell(formattedDate),
        cleanCell(order.customer),
        cleanCell(order.username),
        cleanCell(order.type),
        cleanCell(order.location),
        itemsText,
        cleanCell(order.notes),
        cleanCell(order.payment),
        Number(order.total || 0),
        cleanCell(order.status),
      ];
    });

    const orderCountLabel = `${exportMatchedOrders.length} ${
      exportMatchedOrders.length === 1 ? 'order' : 'orders'
    }`;

    const totalRow = [
      'TOTAL',
      orderCountLabel,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      Number(exportTotalRevenue || 0),
      exportStatus,
    ];

    const titleRow = ['BISTRO ELEVEN — SALES REPORT', ...Array(10).fill('')];
    const metaRow = [
      `Period: ${periodLabel}   |   Status: ${exportStatus}   |   Exported: ${new Date().toLocaleString('en-GB')}`,
      ...Array(10).fill(''),
    ];
    const spacerRow = Array(11).fill('');

    const sheetData = [titleRow, metaRow, spacerRow, headers, ...dataRows, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'E2D6C8' } },
      bottom: { style: 'thin', color: { rgb: 'E2D6C8' } },
      left: { style: 'thin', color: { rgb: 'E2D6C8' } },
      right: { style: 'thin', color: { rgb: 'E2D6C8' } },
    };

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    ];

    // Style title & subtitle banner
    for (let c = 0; c < 11; c += 1) {
      const tRef = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[tRef]) {
        ws[tRef].s = {
          font: { bold: true, sz: 14, color: { rgb: '3A2216' } },
          fill: { fgColor: { rgb: 'FFF8F0' } },
          alignment: { vertical: 'center', horizontal: 'left' },
        };
      }
      const mRef = XLSX.utils.encode_cell({ r: 1, c });
      if (ws[mRef]) {
        ws[mRef].s = {
          font: { sz: 10, color: { rgb: '7C6254' } },
          fill: { fgColor: { rgb: 'FFF8F0' } },
          alignment: { vertical: 'center', horizontal: 'left' },
        };
      }
    }

    // Style header row (row index 3)
    for (let c = 0; c < 11; c += 1) {
      const ref = XLSX.utils.encode_cell({ r: 3, c });
      ws[ref].s = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'CF733E' } },
        border: thinBorder,
        alignment: {
          vertical: 'center',
          horizontal: c === 9 ? 'right' : c === 4 || c === 8 || c === 10 ? 'center' : 'left',
        },
      };
    }

    // Style data rows (row index 4 .. 4 + dataRows.length - 1)
    const rowHeights = [{ hpt: 28 }, { hpt: 20 }, { hpt: 10 }, { hpt: 26 }];
    dataRows.forEach((row, idx) => {
      const r = 4 + idx;
      const isAlt = idx % 2 === 1;
      const itemLines = String(row[6] || '').split('\n').length;
      rowHeights.push({ hpt: Math.max(22, itemLines * 16 + 6) });

      for (let c = 0; c < 11; c += 1) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = {
          font: { sz: 10, color: { rgb: '2B1A12' }, bold: c === 0 },
          fill: { fgColor: { rgb: isAlt ? 'FAF5EE' : 'FFFFFF' } },
          border: thinBorder,
          alignment: {
            vertical: 'center',
            horizontal: c === 9 ? 'right' : c === 4 || c === 8 || c === 10 ? 'center' : 'left',
            wrapText: c === 5 || c === 6 || c === 7,
          },
        };
        if (c === 9) {
          ws[ref].z = '#,##0';
        }
      }
    });

    // Style TOTAL row
    const totalRowIdx = 4 + dataRows.length;
    rowHeights.push({ hpt: 26 });
    for (let c = 0; c < 11; c += 1) {
      const ref = XLSX.utils.encode_cell({ r: totalRowIdx, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = {
        font: { bold: true, sz: 11, color: { rgb: '3A2216' } },
        fill: { fgColor: { rgb: 'F4ECE4' } },
        border: {
          top: { style: 'medium', color: { rgb: 'CF733E' } },
          bottom: { style: 'medium', color: { rgb: '3A2216' } },
          left: thinBorder.left,
          right: thinBorder.right,
        },
        alignment: {
          vertical: 'center',
          horizontal: c === 9 ? 'right' : c === 10 ? 'center' : 'left',
        },
      };
      if (c === 9) {
        ws[ref].z = '#,##0';
      }
    }

    ws['!rows'] = rowHeights;
    ws['!cols'] = [
      { wch: 24 }, // Order ID
      { wch: 18 }, // Date & Time
      { wch: 26 }, // Customer Name
      { wch: 16 }, // Username
      { wch: 13 }, // Order Type
      { wch: 20 }, // Location / Table
      { wch: 36 }, // Items Ordered (multiline)
      { wch: 24 }, // Order Notes
      { wch: 16 }, // Payment Method
      { wch: 15 }, // Total (IDR)
      { wch: 14 }, // Status
    ];
    ws['!autofilter'] = { ref: `A4:K${4 + dataRows.length}` };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');

    const periodTag =
      exportRange === 'all'
        ? 'all-sales'
        : exportRange === 'last_year'
          ? 'last-1-year'
          : exportRange === 'month'
            ? `${exportYear}-${exportMonth}`
            : `${exportFromDate || 'start'}_to_${exportToDate || 'end'}`;

    XLSX.writeFile(wb, `bistro-eleven-sales-${periodTag}.xlsx`);
    setShowExportModal(false);
  };

  if (!user) return <Navigate to="/login" />;

  return (
    <main className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow" id="role-label">
            {isAdmin
              ? isId
                ? 'MANAJEMEN RESTORAN'
                : 'RESTAURANT MANAGEMENT'
              : isId
                ? 'AKUN PELANGGAN \u2022 BISTRO ELEVEN'
                : 'CLIENT ACCOUNT \u2022 BISTRO ELEVEN'}
          </p>
          <h1 id="welcome-title">
            {isAdmin
              ? isId
                ? 'Portal Administrator'
                : 'Administrator Portal'
              : isId
                ? `Halo, ${user?.name}.`
                : `Hello, ${user?.name}.`}
          </h1>
          <p className="muted" id="welcome-copy">
            {!isAdmin &&
              (isId
                ? 'Pilih hidangan, buat pesanan, dan pantau status pesananmu.'
                : 'Browse dishes, place an order, and follow its progress.')}
          </p>
        </div>
        {!isAdmin && (
          <a className="button button-red" id="new-order-link" href="#/">
            {isId ? 'Lihat menu' : 'Browse menu'}
            <span>&rarr;</span>
          </a>
        )}
      </section>

      {isAdmin && (
        <div className="stats-grid">
          <div
            className="stat-card pointer"
            style={{ padding: '24px', textAlign: 'center' }}
            onClick={() => setShowSalesModal(true)}
          >
            <span
              style={{
                fontSize: '11px',
                marginBottom: '8px',
                color: 'var(--muted)',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {isId ? 'Total Penjualan' : 'Total Sales'}
            </span>
            <b style={{ fontSize: '24px', margin: '0 0 8px', display: 'block' }}>
              Rp {revenue.toLocaleString('id-ID')}
            </b>
            <span style={{ fontSize: '12px', color: 'var(--red)', display: 'block' }}>
              {isId ? '↓ Klik untuk rincian' : '↓ Click for details'}
            </span>
          </div>
          <div
            className="stat-card pointer"
            style={{ padding: '24px', textAlign: 'center' }}
            onClick={() => document.getElementById('orders').scrollIntoView({ behavior: 'smooth' })}
          >
            <span
              style={{
                fontSize: '11px',
                marginBottom: '8px',
                color: 'var(--muted)',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {isId ? 'Pesanan Masuk' : 'Incoming Orders'}
            </span>
            <b style={{ fontSize: '24px', margin: '0 0 8px', display: 'block' }}>
              {preparingCount} {isId ? 'Aktif' : 'Active'}
            </b>
            <span style={{ fontSize: '12px', color: 'var(--red)', display: 'block' }}>
              {isId ? '↓ Klik untuk kelola antrean' : '↓ Click to manage queue'}
            </span>
          </div>
          <div
            className="stat-card pointer"
            style={{ padding: '24px', textAlign: 'center' }}
            onClick={() => document.getElementById('chef-inquiries').scrollIntoView({ behavior: 'smooth' })}
          >
            <span
              style={{
                fontSize: '11px',
                marginBottom: '8px',
                color: 'var(--muted)',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {isId ? 'Meja Konsultasi Chef (AI)' : 'Chef Live Desk (AI)'}
            </span>
            <b style={{ fontSize: '24px', margin: '0 0 8px', display: 'block' }}>
              {pendingInquiriesCount} {isId ? 'Menunggu' : 'Pending'}
            </b>
            <span style={{ fontSize: '12px', color: 'var(--red)', display: 'block' }}>
              {isId ? '↓ Klik untuk balas sebagai Chef' : '↓ Click to reply as Chef'}
            </span>
          </div>
          <div
            className="stat-card pointer"
            style={{ padding: '24px', textAlign: 'center' }}
            onClick={() => document.getElementById('add-new-item').scrollIntoView({ behavior: 'smooth' })}
          >
            <span
              style={{
                fontSize: '11px',
                marginBottom: '8px',
                color: 'var(--muted)',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {isId ? 'Tambah Menu Baru' : 'Add New Item'}
            </span>
            <b style={{ fontSize: '24px', margin: '0 0 8px', display: 'block' }}>
              {isId ? 'Input Cepat' : 'Quick Entry'}
            </b>
            <span style={{ fontSize: '12px', color: 'var(--red)', display: 'block' }}>
              {isId ? '↓ Klik untuk tambah menu' : '↓ Click to add item'}
            </span>
          </div>
        </div>
      )}

      <section className="panel" id="orders">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{isId ? 'RINGKASAN' : 'OVERVIEW'}</p>
            <h2 id="orders-title">
              {isAdmin
                ? isId
                  ? 'Antrean Pesanan Pelanggan'
                  : 'Customer Orders Queue'
                : isId
                  ? 'Pesanan saya'
                  : 'My orders'}
            </h2>
          </div>
          {isAdmin && (
            <button
              type="button"
              className="button button-red"
              style={{ minHeight: '40px', padding: '0 16px', gap: '8px' }}
              onClick={() => setShowExportModal(true)}
            >
              📊 {isId ? 'Export Spreadsheet (.xlsx)' : 'Export Spreadsheet (.xlsx)'}
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="filter-tabs" id="order-filters">
            <button
              className={`filter-tab ${filter === 'Active' ? 'active' : ''}`}
              onClick={() => setFilter('Active')}
            >
              {isId ? 'Aktif' : 'Active'}
            </button>
            <button
              className={`filter-tab ${filter === 'Completed' ? 'active' : ''}`}
              onClick={() => setFilter('Completed')}
            >
              {isId ? 'Selesai' : 'Completed'}
            </button>
            <button
              className={`filter-tab ${filter === 'All' ? 'active' : ''}`}
              onClick={() => setFilter('All')}
            >
              {isId ? 'Semua Pesanan' : 'All Orders'}
            </button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{isId ? 'ID Pesanan' : 'Order ID'}</th>
                <th>{isId ? 'Pelanggan' : 'Customer'}</th>
                <th>{isId ? 'Tipe & Tujuan' : 'Type & Destination'}</th>
                <th>{isId ? 'Menu & Jumlah' : 'Items & Qty'}</th>
                <th>Total</th>
                <th>Status</th>
                <th>{isId ? 'Aksi' : 'Action'}</th>
              </tr>
            </thead>
            <tbody id="orders-list">
              {ordersLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                    <p className="empty-state">{isId ? 'Memuat pesanan...' : 'Loading orders...'}</p>
                  </td>
                </tr>
              ) : ordersError && filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                    <p className="error" style={{ marginBottom: '10px' }}>{ordersError}</p>
                    <button type="button" className="filter-tab active" onClick={() => loadOrders(true)}>
                      {isId ? 'Coba lagi' : 'Retry'}
                    </button>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                    <p className="empty-state">{isId ? 'Belum ada pesanan.' : 'No orders yet.'}</p>
                  </td>
                </tr>
              )}
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <b>{order.id}</b>
                  </td>
                  <td>{order.customer}</td>
                  <td>
                    {order.type}
                    <br />
                    {order.type === 'Dine-in' ? (
                      <span className="terracotta">{order.location}</span>
                    ) : (
                      <span className="warm-slate">{order.location}</span>
                    )}
                  </td>
                  <td>
                    {order.items.map((item, idx) => (
                      <div key={idx}>
                        <b>{item.qty}x</b> {item.name}
                      </div>
                    ))}
                    {order.notes && (
                      <div>
                        <small style={{ fontStyle: 'italic' }}>
                          &#128221; {isId ? 'Catatan' : 'Note'}: &ldquo;{order.notes}&rdquo;
                        </small>
                      </div>
                    )}
                  </td>
                  <td>Rp {order.total.toLocaleString('id-ID')}</td>
                  <td>
                    <span className={`badge-status bg-${order.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    {isAdmin ? (
                      <select
                        className="status-select"
                        aria-label={`Update status for ${order.id}`}
                        value={order.status}
                        onChange={(event) => handleOrderStatus(order.id, event.target.value)}
                      >
                        {['New', 'Preparing', 'On the way', 'Completed', 'Cancelled'].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button className="button-action btn-complete" onClick={() => setSelectedBill(order)}>
                        {isId ? 'Lihat struk' : 'View bill'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBill && (
        <div
          className="order-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedBill(null);
          }}
        >
          <section className="bill-card" role="dialog" aria-modal="true" aria-labelledby="saved-bill-title">
            <button className="modal-close" aria-label="Close bill" onClick={() => setSelectedBill(null)}>
              &times;
            </button>
            <p className="eyebrow">BISTRO ELEVEN</p>
            <h2 id="saved-bill-title">{isId ? 'Struk pesanan' : 'Order bill'}</h2>
            <p className="bill-id">Order {selectedBill.id}</p>
            <div className="bill-details">
              <p>
                <b>{selectedBill.customer}</b>
              </p>
              <p>
                {selectedBill.type}: {selectedBill.location}
              </p>
              <p>
                {isId ? 'Pembayaran' : 'Payment'}: {selectedBill.payment}
              </p>
              <p>
                Status: <b>{selectedBill.status}</b>
              </p>
            </div>
            <div className="bill-lines">
              {selectedBill.items.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <span>
                    {item.qty}x {item.name}
                  </span>
                  <span>Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="bill-total">
              <span>{isId ? 'Total pesanan' : 'Order total'}</span>
              <b>Rp {selectedBill.total.toLocaleString('id-ID')}</b>
            </div>
            <button className="button button-red" onClick={() => setSelectedBill(null)}>
              {isId ? 'Tutup' : 'Close'}
            </button>
          </section>
        </div>
      )}

      {isAdmin && (
        <section className="panel" id="chef-inquiries">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">KITCHEN DESK &bull; AI CONCIERGE ESCALATIONS</p>
              <h2>
                {isId
                  ? '👨‍🍳 Pertanyaan Pelanggan untuk Head Chef'
                  : '👨‍🍳 Customer Inquiries for Head Chef'}
              </h2>
              <p className="muted" style={{ marginTop: '4px' }}>
                {isId
                  ? 'Pertanyaan pelanggan yang tidak dapat dijawab AI dan dialihkan langsung ke dapur untuk dijawab oleh Chef.'
                  : 'Customer questions escalated from the AI Concierge for a direct response from the Head Chef.'}
              </p>
            </div>
          </div>

          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-tab ${inquiryFilter === 'Pending' ? 'active' : ''}`}
              onClick={() => setInquiryFilter('Pending')}
            >
              {isId ? `Belum Dijawab (${pendingInquiriesCount})` : `Pending (${pendingInquiriesCount})`}
            </button>
            <button
              type="button"
              className={`filter-tab ${inquiryFilter === 'Answered' ? 'active' : ''}`}
              onClick={() => setInquiryFilter('Answered')}
            >
              {isId
                ? `Sudah Dijawab (${chefInquiries.length - pendingInquiriesCount})`
                : `Answered (${chefInquiries.length - pendingInquiriesCount})`}
            </button>
            <button
              type="button"
              className={`filter-tab ${inquiryFilter === 'All' ? 'active' : ''}`}
              onClick={() => setInquiryFilter('All')}
            >
              {isId ? `Semua (${chefInquiries.length})` : `All (${chefInquiries.length})`}
            </button>
          </div>

          <div className="chef-inquiries-list">
            {inquiriesLoading ? (
              <p className="empty-state" style={{ textAlign: 'center', padding: '28px 0' }}>
                {isId ? 'Memuat pertanyaan untuk Chef...' : 'Loading Chef inquiries...'}
              </p>
            ) : inquiriesError && filteredInquiries.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '28px 0' }}>
                <p className="error" style={{ marginBottom: '10px' }}>{inquiriesError}</p>
                <button type="button" className="filter-tab active" onClick={() => loadInquiries(true)}>
                  {isId ? 'Coba lagi' : 'Retry'}
                </button>
              </div>
            ) : filteredInquiries.length === 0 && (
              <p className="empty-state" style={{ textAlign: 'center', padding: '28px 0' }}>
                {isId
                  ? 'Belum ada pertanyaan pelanggan di kategori ini.'
                  : 'No customer inquiries in this category yet.'}
              </p>
            )}

            {filteredInquiries.map((inquiry) => (
              <div key={inquiry.id} className="chef-inquiry-card">
                <div className="chef-inquiry-top">
                  <div>
                    <b className="chef-inquiry-customer">{inquiry.customerName}</b>
                    {inquiry.username && <span className="chef-inquiry-username"> (@{inquiry.username})</span>}
                    <span className="chef-inquiry-time"> &bull; #{inquiry.id}</span>
                  </div>
                  <span
                    className={`badge-status ${
                      inquiry.status === 'Answered' ? 'bg-completed' : 'bg-preparing'
                    }`}
                  >
                    {inquiry.status === 'Answered'
                      ? isId
                        ? 'Dijawab Chef'
                        : 'Answered by Chef'
                      : isId
                        ? 'Menunggu Chef'
                        : 'Pending Chef Reply'}
                  </span>
                </div>

                <div className="chef-inquiry-question">
                  <small className="eyebrow" style={{ display: 'block', marginBottom: '4px' }}>
                    {isId ? 'PERTANYAAN PELANGGAN' : 'CUSTOMER QUESTION'}
                  </small>
                  <p>&ldquo;{inquiry.question}&rdquo;</p>
                </div>

                {inquiry.aiContext && (
                  <div className="chef-inquiry-ai-note">
                    <small>
                      🤖 <b>{isId ? 'Respon Awal AI:' : 'Initial AI Note:'}</b> {inquiry.aiContext}
                    </small>
                  </div>
                )}

                {inquiry.status === 'Answered' && inquiry.chefReply && (
                  <div className="chef-inquiry-answered-box">
                    <small
                      className="eyebrow"
                      style={{ display: 'block', marginBottom: '4px', color: 'var(--red)' }}
                    >
                      {isId ? '👨‍🍳 JAWABAN HEAD CHEF' : '👨‍🍳 HEAD CHEF REPLY'}
                    </small>
                    <p>{inquiry.chefReply}</p>
                  </div>
                )}

                <div className="chef-reply-form">
                  <div className="chef-quick-templates">
                    {chefTemplates.map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        className="chef-template-chip"
                        onClick={() => setChefDrafts((current) => ({ ...current, [inquiry.id]: tpl }))}
                      >
                        + {tpl.slice(0, 44)}...
                      </button>
                    ))}
                  </div>
                  <div className="chef-reply-row">
                    <textarea
                      rows="2"
                      placeholder={
                        inquiry.status === 'Answered'
                          ? isId
                            ? 'Perbarui jawaban Head Chef untuk pelanggan ini...'
                            : 'Update Head Chef reply for this customer...'
                          : isId
                            ? 'Tulis jawaban langsung dari Head Chef untuk pelanggan ini...'
                            : 'Write a direct reply from the Head Chef for this customer...'
                      }
                      value={chefDrafts[inquiry.id] || ''}
                      onChange={(e) =>
                        setChefDrafts((current) => ({ ...current, [inquiry.id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="button button-red"
                      disabled={replyingId === inquiry.id}
                      onClick={() => handleChefReply(inquiry.id)}
                    >
                      {replyingId === inquiry.id
                        ? isId
                          ? 'Mengirim...'
                          : 'Sending...'
                        : inquiry.status === 'Answered'
                          ? isId
                            ? 'Perbarui Jawaban'
                            : 'Update Reply'
                          : isId
                            ? '👨‍🍳 Kirim Jawaban Chef'
                            : '👨‍🍳 Send Chef Reply'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="panel admin-tools" id="add-new-item">
          <h3>{isId ? 'Tambah Menu Baru' : 'Add New Item'}</h3>
          <p className="muted">
            {isId
              ? 'Tambahkan hidangan baru ke katalog menu restoran.'
              : 'Add a dish to the restaurant menu catalog.'}
          </p>
          <form id="add-dish-form" className="clean-form" onSubmit={handleAddDish}>
            <label>{isId ? 'Nama Menu' : 'Item Name'}</label>
            <input
              placeholder={isId ? 'Nama Menu' : 'Item Name'}
              required
              value={newDish.name}
              onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
            />
            <label>{isId ? 'Harga (IDR)' : 'Price (IDR)'}</label>
            <input
              type="number"
              min="1000"
              step="1000"
              placeholder={isId ? 'Harga (IDR)' : 'Price (IDR)'}
              required
              value={newDish.price}
              onChange={(e) => setNewDish({ ...newDish, price: e.target.value })}
            />
            <label>{isId ? 'Foto Menu' : 'Dish Photo'}</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={handlePhotoUpload}
              disabled={uploadingDishPhoto || savingDish}
            />
            {uploadingDishPhoto && (
              <small className="muted">
                {isId
                  ? 'Mengompres & mengunggah foto menu ke cloud storage...'
                  : 'Compressing & uploading dish photo to cloud storage...'}
              </small>
            )}
            {newDish.photo && newDish.photo.startsWith('http') && (
              <small className="verified-label" style={{ wordBreak: 'break-all' }}>
                Cloud URL: {newDish.photo}
              </small>
            )}
            {newDish.preview && (
              <img
                className="upload-preview"
                src={newDish.preview}
                alt="Dish photo preview"
                style={{ display: 'block' }}
              />
            )}
            <label>{isId ? 'Deskripsi' : 'Description'}</label>
            <textarea
              rows="2"
              placeholder={isId ? 'Deskripsi singkat rasa dan sajian' : 'Brief taste and ingredients'}
              required
              value={newDish.description}
              onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
            ></textarea>
            <label>{isId ? 'Komposisi Bahan' : 'Ingredients'}</label>
            <textarea
              rows="2"
              placeholder={isId ? 'Pisahkan bahan dengan koma' : 'Separate ingredients with commas'}
              required
              value={newDish.ingredients}
              onChange={(e) => setNewDish({ ...newDish, ingredients: e.target.value })}
            ></textarea>
            <div className="form-actions">
              <button
                className="button button-red save-catalog"
                type="submit"
                disabled={uploadingDishPhoto || savingDish}
                style={{ width: 'fit-content', padding: '0 24px', minHeight: '40px' }}
              >
                {savingDish
                  ? isId
                    ? 'Menyimpan...'
                    : 'Saving...'
                  : isId
                    ? 'Simpan ke Katalog'
                    : 'Save to Catalog'}
              </button>
            </div>
          </form>
          <div id="admin-dish-list">
            <h4>{isId ? 'Menu saat ini' : 'Current menu'}</h4>
            {dishes.map((dish) => (
              <div key={dish.id} className="admin-dish-row">
                <span className="admin-dish-info">
                  <img src={dish.image} alt="" />
                  <span>
                    {dish.name} &bull; Rp {dish.price.toLocaleString('id-ID')}
                  </span>
                </span>
                <button type="button" className="remove-dish" onClick={() => handleDeleteDish(dish.id)}>
                  {isId ? 'Hapus' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showSalesModal && (
        <div
          className="drawer-backdrop open"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowSalesModal(false)}
        >
          <div
            className="panel"
            style={{ width: '400px', maxWidth: '90%', margin: '0 auto', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
              }}
              onClick={() => setShowSalesModal(false)}
            >
              &times;
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
              {isId ? 'Transaksi Selesai' : 'Completed Transactions'}
            </h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {completedOrders.length > 0 ? (
                completedOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      padding: '12px 0',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      <b>{o.id}</b> - {o.customer}
                    </span>
                    <span>Rp {o.total.toLocaleString('id-ID')}</span>
                  </div>
                ))
              ) : (
                <p className="muted">
                  {isId ? 'Belum ada transaksi selesai.' : 'No completed transactions.'}
                </p>
              )}
            </div>
            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '2px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
              }}
            >
              <span>{isId ? 'Total Pendapatan:' : 'Total Revenue:'}</span>
              <span>Rp {revenue.toLocaleString('id-ID')}</span>
            </div>
            <button
              type="button"
              className="button button-red"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => {
                setShowSalesModal(false);
                setShowExportModal(true);
              }}
            >
              📊 {isId ? 'Download Laporan Spreadsheet' : 'Download Sales Spreadsheet'}
            </button>
          </div>
        </div>
      )}

      {showExportModal && isAdmin && (
        <div
          className="drawer-backdrop open"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="panel"
            style={{ width: '480px', maxWidth: '92%', margin: '0 auto', position: 'relative', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
              onClick={() => setShowExportModal(false)}
            >
              &times;
            </button>
            <p className="eyebrow" style={{ marginBottom: '6px' }}>
              EXCEL &amp; GOOGLE SHEETS (.XLSX)
            </p>
            <h3 style={{ marginTop: 0, marginBottom: '8px', textAlign: 'left' }}>
              {isId ? '📊 Download Laporan Penjualan' : '📊 Export Sales Spreadsheet'}
            </h3>
            <p className="muted" style={{ marginTop: 0, marginBottom: '18px', textAlign: 'left' }}>
              {isId
                ? 'Pilih rentang waktu data pesanan dari database untuk diunduh ke Excel atau Google Sheets.'
                : 'Choose the date range of orders from the database to download for Excel or Google Sheets.'}
            </p>

            <div className="clean-form" style={{ marginBottom: '12px' }}>
              <label htmlFor="export-range">{isId ? 'Periode Waktu' : 'Time Period'}</label>
              <select
                id="export-range"
                value={exportRange}
                onChange={(e) => setExportRange(e.target.value)}
                style={{ width: '100%', marginBottom: '14px' }}
              >
                <option value="all">{isId ? 'Semua Penjualan (All Time)' : 'All Sales (All Time)'}</option>
                <option value="last_year">{isId ? 'Setahun Terakhir (365 Hari)' : 'Last 1 Year (365 Days)'}</option>
                <option value="month">{isId ? 'Pilih Bulan & Tahun Tertentu' : 'Specific Month & Year'}</option>
                <option value="custom">{isId ? 'Rentang Tanggal Tertentu (Dari - Sampai)' : 'Custom Date Range (From - To)'}</option>
              </select>

              {exportRange === 'month' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label htmlFor="export-month">{isId ? 'Bulan' : 'Month'}</label>
                    <select
                      id="export-month"
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      {[
                        ['01', 'Jan'], ['02', 'Feb'], ['03', 'Mar'], ['04', 'Apr'],
                        ['05', 'May'], ['06', 'Jun'], ['07', 'Jul'], ['08', 'Aug'],
                        ['09', 'Sep'], ['10', 'Oct'], ['11', 'Nov'], ['12', 'Dec'],
                      ].map(([val, label]) => (
                        <option key={val} value={val}>
                          {val} - {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="export-year">{isId ? 'Tahun' : 'Year'}</label>
                    <input
                      id="export-year"
                      type="number"
                      min="2024"
                      max="2035"
                      value={exportYear}
                      onChange={(e) => setExportYear(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {exportRange === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label htmlFor="export-from">{isId ? 'Dari Tanggal' : 'From Date'}</label>
                    <input
                      id="export-from"
                      type="date"
                      value={exportFromDate}
                      onChange={(e) => setExportFromDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="export-to">{isId ? 'Sampai Tanggal' : 'To Date'}</label>
                    <input
                      id="export-to"
                      type="date"
                      value={exportToDate}
                      onChange={(e) => setExportToDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <label htmlFor="export-status">{isId ? 'Filter Status Pesanan' : 'Order Status Filter'}</label>
              <select
                id="export-status"
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                style={{ width: '100%', marginBottom: '14px' }}
              >
                <option value="Completed">{isId ? 'Hanya Penjualan Selesai (Completed)' : 'Completed Sales Only'}</option>
                <option value="All">{isId ? 'Semua Status (New, Preparing, Completed, Cancelled)' : 'All Statuses'}</option>
              </select>
            </div>

            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
              }}
            >
              <span>
                {isId
                  ? `${exportMatchedOrders.length} pesanan ditemukan`
                  : `${exportMatchedOrders.length} matching orders`}
              </span>
              <b style={{ color: 'var(--red)' }}>Rp {exportTotalRevenue.toLocaleString('id-ID')}</b>
            </div>

            <button
              type="button"
              className="button button-red"
              style={{ width: '100%' }}
              onClick={handleDownloadSpreadsheet}
            >
              ⬇ {isId ? 'Download File Excel (.xlsx)' : 'Download Spreadsheet (.xlsx)'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Dashboard;
