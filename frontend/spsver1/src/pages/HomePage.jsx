import React from 'react';
import Header from '../components/Header';
import Banner from '../components/Banner';
import ProductList from '../components/ProductList';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    <div className="home-page">
      <Header />
      <Banner />
      <ProductList />
      <Footer />
    </div>
  );
};

export default HomePage;