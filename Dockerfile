FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build-env
WORKDIR /app

# Copiar archivos de proyecto y restaurar
COPY InventoryManager.sln ./
COPY Inventory.Application/Inventory.Application.csproj Inventory.Application/
COPY Inventory.Core/Inventory.Core.csproj Inventory.Core/
COPY Inventory.Proyecto/Inventory.Proyecto.csproj Inventory.Proyecto/
COPY Inventory.Settings/Inventory.Settings.csproj Inventory.Settings/
COPY Inventory.Test/Inventory.Test.csproj Inventory.Test/

RUN dotnet restore

# Copiar todo y compilar
COPY . ./
RUN dotnet publish Inventory.Proyecto/Inventory.Proyecto.csproj -c Release -o out

# Construir imagen final
FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=build-env /app/out .

# Render provee el puerto dinamico en la variable PORT
ENV ASPNETCORE_URLS=http://*:${PORT:-80}

ENTRYPOINT ["dotnet", "Inventory.Proyecto.dll"]
