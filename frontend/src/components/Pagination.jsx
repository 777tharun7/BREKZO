import { useState } from 'react';

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) return null;

  return (
    <div className="flex-center" style={{ gap: '0.5rem', marginTop: '2rem' }}>
      <button 
        className="btn btn-secondary btn-sm"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Prev
      </button>
      
      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
        Page {currentPage} of {totalPages}
      </span>
      
      <button 
        className="btn btn-secondary btn-sm"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
