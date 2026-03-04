import React from 'react';

const ProductCard = ({ discount, image, name, price, oldPrice }) => {
  return (
    <div className="product-card">
      <div className="badge">Giảm {discount}</div>
      <img src={image} alt="Sản phẩm" />
      <h3>{name}</h3>
      <p className="price">{price} <span>{oldPrice}</span></p>
      <button className="buy-btn">Chọn mua</button>
    </div>
  );
};

export default ProductCard;