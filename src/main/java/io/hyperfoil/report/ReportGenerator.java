package io.hyperfoil.report;

import io.hyperfoil.tools.yaup.file.FileUtility;
import io.hyperfoil.tools.yaup.json.Json;
import org.aesh.AeshRuntimeRunner;
import org.aesh.command.Command;
import org.aesh.command.CommandDefinition;
import org.aesh.command.CommandResult;
import org.aesh.command.invocation.CommandInvocation;
import org.aesh.command.option.Option;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@CommandDefinition(name="generate-report", description = "generate a report from Hyperfoil output files")
public class ReportGenerator implements Command {

   public static final String DEFAULT_TOKEN = "[/**DATAKEY**/]";

   public static final String PHASE = "(?<phase>[^";


   @Option(shortName = 's', required = true, description = "source folder or archive containing hyperfoil output files")
   private String source;

   @Option(shortName = 'd', required = true, description = "destination for output report file")
   private String destination;

   @Option(shortName = 't', required = false, description = "use a custom html template file", defaultValue = "")
   private String template;

   @Option(shortName = 'x', required = false, description = "replace token in html template file",defaultValue = DEFAULT_TOKEN)
   private String token;


   public static void main(String[] args) {
      AeshRuntimeRunner.builder().command(ReportGenerator.class).args(args).execute();
   }

   @Override
   public CommandResult execute(CommandInvocation commandInvocation) {

      if(template!=null && !template.isEmpty()){
         if( !(new File(template).exists())){
            template = "";//if the teample does not exist we error
            System.out.printf("Could not find template = %s",template);
            return CommandResult.FAILURE;
         }
      }
      if( (template==null || template.isEmpty() ) && !DEFAULT_TOKEN.equals(token)){
         System.out.printf("A token should only be defined with a valid template file");
         return CommandResult.FAILURE;
      }
      Json loaded = new Json();

      if(FileUtility.isArchive(getSource())){

         List<String> found = FileUtility.getArchiveEntries("all.json");
         if(!found.isEmpty()){
            loaded = Json.fromFile(getSource() + FileUtility.ARCHIVE_KEY+found.get(0));
         }else{
            System.out.printf("failed to find all.json in archive %s",getSource());
            System.exit(0);
         }
      }else{
         List<String> found = FileUtility.getFiles(getSource(),"all.json",true);
         if(!found.isEmpty()){
            System.out.println("FOUND "+found.get(0));
            loaded = Json.fromFile(found.get(0));
         }else{
            System.out.printf("failed to find all.json in %s",getSource());
            System.exit(0);
         }
      }

      try (
         BufferedReader reader =
            new BufferedReader(
               new InputStreamReader(
                  (template==null || template.isEmpty()) ? ReportGenerator.class.getClassLoader().getResourceAsStream("index.html") : new FileInputStream(template)
               )
            )
      ) {
         String indexHtml = reader.lines().collect(Collectors.joining("\n"));
         indexHtml = indexHtml.replace("[/**DATAKEY**/]",loaded.toString());
         Files.write(Paths.get(getDestination()),indexHtml.getBytes());
         Files.write(Paths.get("/tmp/loaded.json"),loaded.toString().getBytes());

      } catch (FileNotFoundException e) {
         e.printStackTrace();
         return CommandResult.SUCCESS;
      } catch (IOException e) {
         e.printStackTrace();
         return CommandResult.SUCCESS;
      }

      return CommandResult.SUCCESS;
   }

   public String getToken() {
      return token;
   }

   public void setToken(String token) {
      this.token = token;
   }

   public String getTemplate() {
      return template;
   }

   public void setTemplate(String template) {
      this.template = template;
   }

   public String getDestination() {
      return destination;
   }

   public void setDestination(String destination) {
      this.destination = destination;
   }

   public void setSource(String source) {
      this.source = source;
   }
   public String getSource(){return source;}
}
