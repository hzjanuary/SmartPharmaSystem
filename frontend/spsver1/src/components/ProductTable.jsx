import React from 'react';

const ProductTable = () => {
  // Dữ liệu mẫu (sau này lấy từ API)
  const products = [
    { id: 'AK-001', name: 'Dầu cá Omega-3 (100 viên)', category: 'Thực phẩm chức năng', price: '250.000đ', stock: 'Còn 45 hộp' },
    { id: 'AK-002', name: 'Sữa rửa mặt Cetaphil 500ml', category: 'Dược mỹ phẩm', price: '385.000đ', stock: 'Còn 12 chai' }
  ];

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Mã SKU</th>
            <th>Tên sản phẩm</th>
            <th>Danh mục</th>
            <th>Giá niêm yết</th>
            <th>Tồn kho</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>
              <td><b>{product.name}</b></td>
              <td>{product.category}</td>
              <td>{product.price}</td>
              <td><span className="badge badge-success">{product.stock}</span></td>
              <td>
                <i className="fa fa-edit" style={{ color: 'var(--primary-blue)', cursor: 'pointer', marginRight: '15px', fontSize: '16px' }}></i>
                <i className="fa fa-trash" style={{ color: 'var(--danger)', cursor: 'pointer', fontSize: '16px' }}></i>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;