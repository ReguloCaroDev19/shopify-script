import '@shopify/shopify-api/adapters/node';
import express from 'express';
import fetch from "node-fetch";
import dotenv from 'dotenv';
dotenv.config();

const app = express();

const PORT = 4000;
let query = "";
let url = "";
let response = "";
let data = "";
let arrayProductToCollection = [];
app.get('/graphql', async (req, res) => {
	try {
		const shop = 'sagaon-tech';
		const accessToken = process.env.API_KEY;
		const skuFilter = [{
			title: "Eje rotatorio rodillos",
			descriptionHtml: "<p>Con este complemento de tu maquina CNC podrás realizar grabados en objetos cilindricos de manera profesional en todo su perimetro</p>",
			variants: [{ sku: "1089", price: "140.00", imageSrc: "https://sagaonmedia.s3.us-east-2.amazonaws.com/prodimgsjpg/1089-1.jpg" }],
		}, {
			title: "Fuente conmutada - 24v 15a",
			descriptionHtml: "<p>La función de está fuente es absorber los problemas eléctricos de la red, como ruidos, o transitorios. También evita que la propia fuente envíe interferencias a la red.</p>",
			variants: [{ sku: "1298", price: "140.00", taxable: false  }],
			media: [{
				alt: "",
				mediaContentType: "IMAGE",
				originalSource: "https://sagaonmedia.s3.us-east-2.amazonaws.com/prodimgsjpg/1298-1.jpg"
			}]
		}, {
			title: "Tubo laser co2 50w",
			descriptionHtml: "<p>Recipiente hermético de vidrio en forma de tubo que descarga a alta presión para la obtención de rayos láser usados en maquinas de corte.</p>",
			variants: [{ sku: "1356", price: "140.00", imageSrc: "https://sagaonmedia.s3.us-east-2.amazonaws.com/prodimgsjpg/1356-1.jpg" }],
		}, {
			title: "Tarjeta controladora m2",
			descriptionHtml: "<p>Botón de configuración de energía láser: se utiliza para configurar la energía láser, con un rango de 0% a 99,9%. La precisión de configuración es 0,1%.</p>",
			variants: [{ sku: "1453", price: "140.00", taxable: false }],
			media: [{
				alt: "",
				mediaContentType: "IMAGE",
				originalSource: "https://sagaonmedia.s3.us-east-2.amazonaws.com/prodimgsjpg/1453-1.jpg"
			}]
		}, {
			title: "Fuente conmutada para laser - co2-50w",
			descriptionHtml: "<p>Fuente de poder para tubo laser CO2 de 50w</p>",
			variants: [{ sku: "1460", price: "140.00", taxable: false }],
			media: [{
				alt: "",
				mediaContentType: "IMAGE",
				originalSource: "https://sagaonmedia.s3.us-east-2.amazonaws.com/prodimgsjpg/1460-1.jpg"
			}]
		}]
		url = `https://${shop}.myshopify.com/admin/api/2024-01/graphql.json`;
		query = ` mutation CreateCollection($tituloColeccion: String!) {
			collectionCreate(input: {
				title: $tituloColeccion
			}) {
				collection {
					id
					title
				}
			}
		}`;
		const variables = {
			tituloColeccion: "Prueba Script",
			id: ""
		};
		response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Access-Token': accessToken
			},
			body: JSON.stringify({ query, variables })
		});
		data = await response.json();

		if (data.data?.collectionCreate?.collection?.title === variables.tituloColeccion) {
			variables.id = data.data?.collectionCreate?.collection?.id

			async function procesarSkuFilter() {
				arrayProductToCollection = []
				for (const product of skuFilter) {
					let query = `query {
        		    products(first: 1, query: "sku:${product.variants[0].sku}") {
        		        edges {
        		            node {
        		                id
        		                title
        		                variants(first: 1) {
        		                    edges {
        		                        node {
        		                            id
        		                            sku
        		                        }
        		                    }
        		                }
        		            }
        		        }
        		    }
        		}`;

					try {
						const response = await fetch(url, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-Shopify-Access-Token': accessToken
							},
							body: JSON.stringify({ query })
						});

						const data = await response.json();

						if (data.data.products.edges.length === 0) {
							query = `mutation CreateProduct($product: ProductInput!, $imgData: [CreateMediaInput!]) {
                    			productCreate(input: $product, media: $imgData) {
                    			    product {
                    			        id
                    			        title
                    			    }
                    			    userErrors {
                    			        field
                    			        message
                    			    }
                    			}
                			}`;

							try {
								const formatProduct = {
									title: product.title,
									descriptionHtml: product.descriptionHtml,
									variants: product.variants,
								}
								const response = await fetch(url, {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										'X-Shopify-Access-Token': accessToken
									},
									body: JSON.stringify({ query, variables: { product: formatProduct, imgData: product.media } })
								});

								const data = await response.json();
								if (data.data.productCreate.product.id) {
									console.log("Se dio de alta este producto", data.data.productCreate.product.title);
									arrayProductToCollection.push(data.data.productCreate.product.id)
								}
							} catch (e) {
								console.log(e);
							}
						} else {
							console.log("EXISTE EL PRODUCTO", data.data.products.edges[0].node.id);
							arrayProductToCollection.push(data.data?.products?.edges[0].node.id)
						}
					} catch (error) {
						console.error('Error al procesar la solicitud:', error);
					}
				}
			}


			// let productsWithVariants = []
			// const products = data.data.products.edges;
			// const onlyIDProducts = products.map((x) => x.node.id);
			// products.forEach(product => {
			// 	const variants = product.node.variants.edges.filter(variant => skuFilter.includes(variant.node.sku)).map((x) => x.node.id).join(",");
			// 	productsWithVariants.push(variants)
			// });
			// variables.productIds = [...onlyIDProducts]
			try {
				// Esperar a que el bucle termine
				await procesarSkuFilter();

				if (arrayProductToCollection.length > 0) {
					console.log('====================================');
					console.log(arrayProductToCollection);
					console.log('====================================');
					query = `mutation AddProducts($id: ID!, $productIds: [ID!]!) {
			 		collectionAddProducts(id: $id, productIds: $productIds) {
			 		  collection {
			 			id
			 			title
			 		  }
			 		}
			 	  }`;
					response = await fetch(url, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'X-Shopify-Access-Token': accessToken
						},
						body: JSON.stringify({ query, variables: { id: variables.id, productIds: arrayProductToCollection } })
					});
					data = await response.json();
					res.send(data)
				}
			} catch (error) {
				console.error('Error:', error);
			}


		} else {
			res.send("Hubo un error al crear la colección")
		}

	} catch (error) {
		console.error('Error al enviar la solicitud:', error);
		res.status(500).json({ error: 'Error al enviar la solicitud' });
	}
});

app.listen(PORT, () => {
	console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});