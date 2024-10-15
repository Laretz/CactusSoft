const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = {
  async execute() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // nessa parte do codigo, ele agrupo as metricas pelo costumerID e calcula a media de latencia para cada grupo nos ultimos 7 dias e também deixa em ordem crescente 
      let clientesPorMediaDeLatencia = await prisma.metrics.groupBy({
        by: ['customerId'],
        _avg: {
          latency: true,
        },
        where: {
          date: {
            gte: sevenDaysAgo,
          },
          latency: {
            not: null,
          },
        },
        orderBy: {
          _avg: {
            latency: 'asc',
          },
        },
        take: 3, 
      });
      // nessa segunda parte, para cada grupo em clientesPorMediaDeLatencia que a gente ja obteve, buscamos algumas metricas necesarias: id data e latencia
      let clientes = await Promise.all(
        clientesPorMediaDeLatencia.map(async (grupo) => {
          const clienteDetalhes = await prisma.customers.findUnique({
            where: {
              id: grupo.customerId,
            },
            include: {
              Metrics: {
                select: {
                  id: true,
                  date: true,
                  latency: true,
                }
              },
            },
          });
          return {  //no retorno ele ta retornando um objeto com essas 3 caracteristicas para cada grupo
            avgLatency: grupo._avg.latency, 
            customerDetails: clienteDetalhes, 
          };
        })
      );

      return clientes; // Retorna a lista de clientes com a média de latência
    } catch (error) {
      // Tratamento de erros
      error.path = "src/models/packetLossAvgClientes.js";
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  },
};
