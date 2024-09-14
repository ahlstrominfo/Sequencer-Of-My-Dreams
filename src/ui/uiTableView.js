const UIBase = require("./uiBase");

class UITableView extends UIBase {
    constructor(terminalUI, sequencer) {
        super(terminalUI, sequencer);
        this.currentPage = 0;
        this.nrPages = 1;
        this.columnsPerPage = 5; // Number of columns to display per page
    }

    /**
     * Get the value of a column, handling both static values and function-based values
     * @param {Object} col - The column object
     * @returns {*} The value of the column
     */
    getValue(col) {
        return typeof col.value === 'function' ? col.value() : col.value;
    }

    /**
     * Pad a value to a specified length, with optional alignment
     * @param {*} value - The value to pad
     * @param {number} padding - The total length after padding
     * @param {string} alignment - 'left' or 'right' alignment
     * @returns {string} The padded value
     */
    padValue(value, padding, alignment = 'left') {
        const strValue = String(value);
        if (alignment === 'right') {
            return strValue.padStart(padding);
        } else {
            return strValue.padEnd(padding);
        }
    }

    /**
     * Format a value based on its selection and editing state
     * @param {*} value - The value to format
     * @param {boolean} isSelected - Whether the value is selected
     * @param {boolean} isEditing - Whether the value is being edited
     * @returns {string} The formatted value
     */
    formatValue(value, isSelected, isEditing) {
        if (isEditing) return `[${value}]`;
        if (isSelected) return `<${value}>`;
        return value;
    }

    /**
     * Calculate the widths for each column on the current page
     * @param {Object} templateRow - A row object used as a template for column structure
     * @returns {number[]} An array of column widths
     */
    getColumnWidths(templateRow) {
        const startCol = this.currentPage * this.columnsPerPage;
        const endCol = startCol + this.columnsPerPage;
        return templateRow.cols.slice(startCol, endCol).map((col, index) => {
            const maxContentWidth = Math.max(
                col.name.length,
                ...this.rows
                    .filter(row => row.cols)
                    .map(row => String(this.getValue(row.cols[startCol + index])).length)
            );
            return Math.max(maxContentWidth, col.padding || 0);
        });
    }

    /**
     * Render the header row of the table
     * @param {Object} templateRow - A row object used as a template for column structure
     * @param {number[]} colWidths - An array of column widths
     */
    renderHeader(templateRow, colWidths) {
        const startCol = this.currentPage * this.columnsPerPage;
        const headers = templateRow.cols.slice(startCol, startCol + this.columnsPerPage).map((col, index) => 
            this.padValue(col.name, colWidths[index])
        ).join(' | ');
        console.log('  ' + headers + '  ');
        console.log('-'.repeat(headers.length));
    }

    /**
     * Render a single table row
     * @param {Object} row - The row object to render
     * @param {number} rowIndex - The index of the row
     * @param {number[]} colWidths - An array of column widths
     */
    renderTableRow(row, rowIndex, colWidths) {
        // Check if this is the currently selected row
        const isSelectedRow = rowIndex === this.editRow;

        // Calculate the starting column index for the current page
        const startCol = this.currentPage * this.columnsPerPage;

        // Process and format each visible column in the row
        const rowData = row.cols.slice(startCol, startCol + this.columnsPerPage).map((col, colIndex) => {
            // Calculate the global column index (across all pages)
            const globalColIndex = startCol + colIndex;

            // Determine if this cell is currently selected
            const isSelectedCol = globalColIndex === this.editCol && isSelectedRow;

            // Determine if this cell is currently being edited
            const isEditingCol = this.isEditingField && isSelectedCol;

            // Get the value for this cell
            const value = this.getValue(col);

            // Format the value based on its selection and editing state
            let formattedValue = this.formatValue(value, isSelectedCol, isEditingCol);

            // Pad the formatted value to align with other cells in the column
            return this.padValue(formattedValue, colWidths[colIndex], col.alignment);
        });

        // Construct the final row string
        // Add a '>' prefix if this is the selected row, otherwise add a space
        // Join the formatted cell values with ' | ' separators
        const rowString = (isSelectedRow && this.nrPages > 1 && this.currentPage > 0 ? '< ' : '  ') 
            + rowData.join(' | ') 
            + (isSelectedRow && this.nrPages > 1 && this.currentPage < this.nrPages - 1? ' >' : '  ');

        // Output the constructed row string
        console.log(rowString);
    }

    /**
     * Render the entire table view
     */
    render() {
        if (this.rows.length === 0) return;

        const templateRow = this.rows.find(row => row.cols);
        
        if (templateRow) {
            this.nrPages = Math.ceil(templateRow.cols.length / this.columnsPerPage);

            // Ensure the current page contains the selected column
            this.currentPage = Math.floor(this.editCol / this.columnsPerPage);

            const colWidths = this.getColumnWidths(templateRow);
            this.renderHeader(templateRow, colWidths);

            this.rows.forEach((row, rowIndex) => {
                if (row.cols) {
                    this.renderTableRow(row, rowIndex, colWidths);
                } else {
                    // Handle special rows (e.g., "Add new note series")
                    const isSelectedRow = rowIndex === this.editRow;
                    const isEditingRow = this.isEditingField && isSelectedRow;
                    if (row.rowRender) {
                        console.log(row.rowRender({isSelected: isSelectedRow, isEditing: isEditingRow, row}));
                    } else {
                        console.log(this.renderRow(row, rowIndex, isSelectedRow, isEditingRow));
                    }
                }
            });
        } else {
            super.render();
        }
    }

    /**
     * Handle left/right navigation in the table
     * @param {number} delta - The direction and amount to move (-1 for left, 1 for right)
     */
    handleLeftRight(delta) {
        const templateRow = this.rows.find(row => row.cols);
        if (!templateRow) return super.handleLeftRight(delta);

        const totalCols = templateRow.cols.length;

        if (this.isEditingField) {
            this.handleNavigation(delta, 10);
        } else {
            // Update the selected column and page
            this.editCol = (this.editCol + delta + totalCols) % totalCols;
            this.currentPage = Math.floor(this.editCol / this.columnsPerPage);
        }
    }

    /**
     * Handle navigation within the table
     * @param {number} direction - The direction to move (-1 for up/left, 1 for down/right)
     * @param {number} step - The amount to move
     */
    handleNavigation(direction, step = 1) {
        if (this.isEditingField) {
            const currentRow = this.rows[this.editRow];
            if (currentRow.cols && currentRow.cols[this.editCol] && currentRow.cols[this.editCol].handle) {
                currentRow.cols[this.editCol].handle(direction, step);
            }
        } else {
            super.handleNavigation(direction, step);
        }
    }
}

module.exports = UITableView;