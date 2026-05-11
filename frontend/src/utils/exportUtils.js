// Export utility functions for all detail pages
import * as XLSX from 'xlsx';

// Export single expense to Excel for payment processing (S. no, Exp No, Exp Category, Beneficiary Name, Account, IFSC, Amount)
export const exportSingleExpenseToExcel = async (expenseId, expenseAPI, setError) => {
  try {
    const response = await expenseAPI.getById(expenseId);
    if (!response.data?.success || !response.data.data) {
      setError?.('Failed to fetch expense details for export');
      return false;
    }
    const exp = response.data.data;
    const beneficiary = exp.submittedBy;
    const bankDetails = beneficiary?.bankDetails || {};
    const row = [
      1, // S. no
      exp.expenseNumber || '',
      exp.category || '',
      beneficiary?.name || exp.submittedBy?.name || 'N/A',
      bankDetails.accountNumber || '',
      bankDetails.ifscCode || '',
      exp.amount || 0
    ];
    const headers = ['S. no', 'Exp No', 'Exp Category', 'Beneficiary Name', 'Account', 'IFSC', 'Amount'];
    const wsData = [headers, row];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment');
    XLSX.writeFile(wb, `expense-${exp.expenseNumber || expenseId}-${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  } catch (err) {
    console.error('Excel export failed:', err);
    setError?.('Failed to export to Excel. Please try again.');
    return false;
  }
};

// Export multiple expenses to Excel (same format)
export const exportExpensesToExcel = (expenses, filename = 'payment-export') => {
  try {
    const headers = ['S. no', 'Exp No', 'Exp Category', 'Beneficiary Name', 'Account', 'IFSC', 'Amount'];
    const rows = expenses.map((exp, i) => {
      const beneficiary = exp.submittedBy;
      const bankDetails = beneficiary?.bankDetails || {};
      return [
        i + 1,
        exp.expenseNumber || '',
        exp.category || '',
        beneficiary?.name || exp.submittedBy?.name || 'N/A',
        bankDetails.accountNumber || '',
        bankDetails.ifscCode || '',
        exp.amount || 0
      ];
    });
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  } catch (err) {
    console.error('Excel export failed:', err);
    return false;
  }
};

export const exportToJSON = (data, filename, user) => {
  try {
    console.log('📤 Exporting data...');
    
    const exportData = {
      ...data,
      exportDate: new Date().toISOString(),
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        site: user.site?.name || 'N/A'
      }
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Export successful');
    return true;
  } catch (error) {
    console.error('❌ Export failed:', error);
    return false;
  }
};

export const exportToCSV = (data, filename, user) => {
  try {
    console.log('📤 Exporting CSV data...');
    
    // Convert data to CSV format
    let csvContent = '';
    
    // Add summary section
    if (data.summary) {
      csvContent += 'SUMMARY\n';
      csvContent += 'Metric,Value\n';
      Object.entries(data.summary).forEach(([key, value]) => {
        csvContent += `${key},${value}\n`;
      });
      csvContent += '\n';
    }
    
    // Add main data based on type
    if (data.expenses && Array.isArray(data.expenses)) {
      csvContent += 'EXPENSES\n';
      const headers = ['ID', 'Title', 'Description', 'Amount', 'Category', 'Date', 'Status', 'Submitted By', 'Site', 'Expense Number'];
      csvContent += headers.join(',') + '\n';
      
      data.expenses.forEach(expense => {
        const row = [
          expense._id || '',
          `"${(expense.clientId || '').replace(/"/g, '""')}"`,
          `"${(expense.clientName || '').replace(/"/g, '""')}"`,
          `"${(expense.description || '').replace(/"/g, '""')}"`,
          expense.amount || 0,
          expense.category || '',
          expense.expenseDate || '',
          expense.status || '',
          expense.submittedBy?.name || '',
          expense.site?.name || '',
          expense.expenseNumber || ''
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (data.users && Array.isArray(data.users)) {
      csvContent += 'USERS\n';
      const headers = ['ID', 'Name', 'Email', 'Role', 'Site', 'Status', 'Created At', 'Last Login'];
      csvContent += headers.join(',') + '\n';
      
      data.users.forEach(user => {
        const row = [
          user._id || '',
          `"${(user.name || '').replace(/"/g, '""')}"`,
          user.email || '',
          user.role || '',
          user.site?.name || '',
          user.isActive ? 'Active' : 'Inactive',
          user.createdAt || '',
          user.lastLogin || ''
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (data.sites && Array.isArray(data.sites)) {
      csvContent += 'SITES\n';
      const headers = ['ID', 'Name', 'Location', 'Budget', 'Monthly Spend', 'Remaining Budget', 'Status', 'Created At'];
      csvContent += headers.join(',') + '\n';
      
      data.sites.forEach(site => {
        const row = [
          site._id || '',
          `"${(site.name || '').replace(/"/g, '""')}"`,
          site.location || '',
          site.budget?.monthly || 0,
          site.statistics?.monthlySpend || 0,
          site.remainingBudget || 0,
          site.isActive ? 'Active' : 'Inactive',
          site.createdAt || ''
        ];
        csvContent += row.join(',') + '\n';
      });
    }
    
    // Add category breakdown if available
    if (data.categoryBreakdown && Array.isArray(data.categoryBreakdown)) {
      csvContent += '\nCATEGORY BREAKDOWN\n';
      csvContent += 'Category,Amount,Percentage\n';
      
      data.categoryBreakdown.forEach(category => {
        csvContent += `${category.category},${category.amount},${category.percentage || 0}%\n`;
      });
    }
    
    // Add monthly trend if available
    if (data.monthlyTrend && Array.isArray(data.monthlyTrend)) {
      csvContent += '\nMONTHLY TREND\n';
      csvContent += 'Month,Amount\n';
      
      data.monthlyTrend.forEach(trend => {
        csvContent += `${trend.month},${trend.amount}\n`;
      });
    }
    
    // Add export info
    csvContent += '\nEXPORT INFO\n';
    csvContent += 'Export Date,' + new Date().toISOString().split('T')[0] + '\n';
    csvContent += 'Exported By,' + (user.name || 'Unknown') + '\n';
    csvContent += 'User Role,' + (user.role || 'Unknown') + '\n';
    csvContent += 'Site,' + (user.site?.name || 'N/A') + '\n';

    // Create and download CSV file
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ CSV Export successful');
    return true;
  } catch (error) {
    console.error('❌ CSV Export failed:', error);
    return false;
  }
};

export const createExportHandler = (data, filename, user, setError) => {
  return () => {
    const success = exportToJSON(data, filename, user);
    if (!success) {
      setError('Failed to export data. Please try again.');
    }
  };
};

export const createCSVExportHandler = (data, filename, user, setError) => {
  return () => {
    const success = exportToCSV(data, filename, user);
    if (!success) {
      setError('Failed to export CSV data. Please try again.');
    }
  };
};

// Finance Report Export — format: clientid | clientname | Monthname | Miscellaneous Amount | Expense ID | Remarks
export const exportFinanceReportToExcel = (expenses, filename = 'finance-report') => {
  try {
    const getMonthName = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }).replace(' ', '-');
    };

    const headers = ['clientid', 'clientname', 'Monthname', 'Miscellaneous Amount', 'Expense ID', 'Remarks'];

    const rows = expenses.map(exp => [
      exp.clientId || '',
      exp.clientName || '',
      getMonthName(exp.expenseDate || exp.submissionDate),
      exp.amount || 0,
      exp.expenseNumber || exp.expenseId || exp._id || '',
      exp.description || ''
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, // clientid
      { wch: 28 }, // clientname
      { wch: 16 }, // Monthname
      { wch: 20 }, // Miscellaneous Amount
      { wch: 14 }, // Expense ID
      { wch: 50 }, // Remarks
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finance Report');
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  } catch (err) {
    console.error('Finance report export failed:', err);
    return false;
  }
};
