-- =============================================
-- Script de Creación de Base de Datos y Tablas
-- Motor: SQL Server
-- =============================================

IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'InventarioDB')
BEGIN
    CREATE DATABASE InventarioDB;
END
GO

USE InventarioDB;
GO

-- Tabla: Productos
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Productos' and xtype='U')
BEGIN
    CREATE TABLE Productos (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Descripcion NVARCHAR(255) NOT NULL,
        FechaCompra DATETIME NOT NULL,
        Costo DECIMAL(18,2) NOT NULL,
        Activo BIT NOT NULL DEFAULT 1
    );
END
GO

-- Tabla: Gastos (Gastos / Compras)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Gastos' and xtype='U')
BEGIN
    CREATE TABLE Gastos (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Motivo NVARCHAR(255) NOT NULL,
        Fecha DATETIME NOT NULL,
        QuienLoHizo NVARCHAR(100) NOT NULL,
        Monto DECIMAL(18,2) NOT NULL,
        ProductoId INT NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
    );
END
GO

-- Tabla: Ventas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Ventas' and xtype='U')
BEGIN
    CREATE TABLE Ventas (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ProductoId INT NOT NULL,
        CostoEnvio DECIMAL(18,2) NOT NULL,
        CostosAdicionales DECIMAL(18,2) NOT NULL,
        FechaVenta DATETIME NOT NULL,
        PrecioVenta DECIMAL(18,2) NOT NULL,
        QuienLoVendio NVARCHAR(100) NOT NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
    );
END
GO

-- Tabla: Movimientos (Bitácora de movimientos)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Movimientos' and xtype='U')
BEGIN
    CREATE TABLE Movimientos (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Tipo NVARCHAR(50) NOT NULL, -- 'Compra', 'Salida de dinero', 'Venta'
        Fecha DATETIME NOT NULL,
        Descripcion NVARCHAR(255) NOT NULL,
        MontoTotal DECIMAL(18,2) NOT NULL, -- Positivo para ventas, Negativo para gastos
        ReferenciaId INT NULL, -- Opcional, puede apuntar a Venta o Gasto si se necesita en el futuro
        Activo BIT NOT NULL DEFAULT 1
    );
END
GO
