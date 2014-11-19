<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:json="http://json.org/">

	<!--
	   XSLTJSON Lite v0.2 - Transform arbitrary XML to JSONML	

	   Licensed under the new BSD License.
	   Copyright 2009, Bram Stein
	   All rights reserved.
	-->
	<xsl:output indent="no" omit-xml-declaration="yes" method="text" encoding="utf-8"/>
	<xsl:strip-space elements="*"/>

	<json:search name="string">
		<json:replace src="\" dst="\\"/>
		<json:replace src="&quot;" dst="\&quot;"/>
		<json:replace src="&#xA;" dst="\n"/>
		<json:replace src="&#xD;" dst="\r"/>
		<json:replace src="&#x9;" dst="\t"/>
		<json:replace src="\n" dst="\n"/>
		<json:replace src="\r" dst="\r"/>
		<json:replace src="\t" dst="\t"/>
	</json:search>


<xsl:template match="fcpxml">
		<xsl:text>{</xsl:text>	
					<xsl:apply-templates select="resources"/>		
					<xsl:apply-templates select="library/event/project/sequence"/>		
			<xsl:text>			
}</xsl:text>
</xsl:template>

	
<xsl:template match="resources">
		<xsl:text>
		"assets":	{</xsl:text>	

<xsl:for-each select="asset">
			<xsl:call-template name="encode">
					<xsl:with-param name="name" select="@id"/>
					<xsl:with-param name="input" select="substring-after(@src,'file://')"/>
				</xsl:call-template>
				<xsl:if test="position() != last()">
					<xsl:text>,</xsl:text>
				</xsl:if>

	</xsl:for-each>
		<xsl:text>},
		"multiclip":	{</xsl:text>	
	<xsl:for-each select="media">
	<xsl:for-each select="multicam">
	<xsl:for-each select="mc-angle">
		<xsl:text>
						"</xsl:text>	
								<xsl:value-of select="@angleID"/><xsl:text>":{</xsl:text>	
			<xsl:call-template name="encode">
					<xsl:with-param name="name" select="'name'"/>
					<xsl:with-param name="input" select="@name"/>
				</xsl:call-template>
					<xsl:text>, "gaps":"</xsl:text>
<xsl:for-each select="gap">
			<xsl:value-of select="@offset"/>
					<xsl:text> gap</xsl:text>
				<xsl:if test="position() != last()">
					<xsl:text> </xsl:text>
				</xsl:if>
	</xsl:for-each><!-- gap -->
		<xsl:text>",</xsl:text>	
		<xsl:text>"clips":"</xsl:text>	
		<xsl:for-each select="clip">
			<xsl:value-of select="@offset"/>						<xsl:text> </xsl:text>	
		<xsl:for-each select="video">
			<xsl:value-of select="@ref"/>
	</xsl:for-each> <!-- video -->
			<xsl:if test="position() != last()">
					<xsl:text> </xsl:text>
				</xsl:if>
	
	</xsl:for-each><!-- clip -->
		<xsl:text>"</xsl:text>	
					<xsl:text>}</xsl:text>
				<xsl:if test="position() != last()">
					<xsl:text>,</xsl:text>
				</xsl:if>
	
	</xsl:for-each><!-- angle -->
			<xsl:text>
			}
</xsl:text>	</xsl:for-each><!-- multicam -->


	
	</xsl:for-each><!-- media -->

</xsl:template>

<xsl:template match="library/event/project/sequence">
		<xsl:text>,
		"sequence":	{</xsl:text>

	<xsl:call-template name="encode">
					<xsl:with-param name="name" select="'duration'"/>
					<xsl:with-param name="input" select="@duration"/>
				</xsl:call-template>		
				<xsl:text>,</xsl:text>

			<xsl:call-template name="encode">
					<xsl:with-param name="name" select="'ref'"/>
					<xsl:with-param name="input" select="spine/mc-clip/@ref"/>
				</xsl:call-template>
									<xsl:text>}</xsl:text>
</xsl:template><!-- sequence -->
	
	
<xsl:template name="encode">
		<xsl:param name="name"/>
		<xsl:param name="input"/>
				<xsl:text>"</xsl:text>
						<xsl:value-of select="$name"/>
				<xsl:text>":"</xsl:text>
				<xsl:value-of select="$input"/>
				<xsl:text>"</xsl:text>
			</xsl:template>

</xsl:stylesheet>
